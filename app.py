from fastapi import FastAPI, Request, Body
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import uvicorn
from openai import OpenAI
import json
import time
import random
from pathlib import Path
import os
from dotenv import load_dotenv
import re
import datetime
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# 加载环境变量
load_dotenv()

app = FastAPI()
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

# 配置OpenAI API
with open('config.example.json', 'r') as f:
    config = json.load(f)

api_key = config['openai']['api_key']
api_base = config['openai']['api_base']

# 创建OpenAI客户端
client = OpenAI(
    api_key=api_key,
    base_url=api_base
)

# 加载CCF推荐列表
with open("ccf_categories.json") as f:
    ccf_data = json.load(f)

# 提取所有venue信息
venues = {}
venue_patterns = {}  # 用于匹配期刊/会议名称的正则表达式

for category in ccf_data["categories"]:
    for journal in category["journals"]:
        abbr = journal["abbreviation"]
        venues[abbr] = {
            "type": "journal",
            "fullName": journal.get("fullName", ""),
            "level": journal.get("level", "A"),
            "url": journal["url"]
        }
        # 创建用于匹配的正则表达式
        pattern = re.escape(abbr)
        if "fullName" in journal:
            pattern = f"{pattern}|{re.escape(journal['fullName'])}"
        venue_patterns[abbr] = re.compile(pattern, re.IGNORECASE)
        
    for conf in category["conferences"]:
        abbr = conf["abbreviation"]
        venues[abbr] = {
            "type": "conference",
            "fullName": conf.get("fullName", ""),
            "level": conf.get("level", "A"),
            "url": conf["url"]
        }
        # 创建用于匹配的正则表达式
        pattern = re.escape(abbr)
        if "fullName" in conf:
            pattern = f"{pattern}|{re.escape(conf['fullName'])}"
        venue_patterns[abbr] = re.compile(pattern, re.IGNORECASE)

@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/analyze")
async def analyze_query(query: dict = Body(...)):
    try:
        query_text = query.get("query", "")
        print(f"Received query: {query_text}")
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "你是一个学术搜索助手，帮助用户生成合适的搜索关键词组合。"
                },
                {
                    "role": "user",
                    "content": f"""
                    基于以下研究需求，生成3-5组不同的英文搜索关键词组合：
                    {query_text}
                    
                    每组关键词应该包含2-4个关键词。
                    返回格式示例：
                    [
                        {{"keywords": ["deep learning", "computer vision", "object detection"]}},
                        {{"keywords": ["CNN", "visual recognition", "real-time"]}},
                        {{"keywords": ["neural networks", "image processing", "YOLO"]}}
                    ]
                    """
                }
            ]
        )
        
        content = response.choices[0].message.content
        print(f"OpenAI response: {content}")
        
        # 尝试解析返回的JSON
        try:
            keyword_groups = json.loads(content)
        except Exception as e:
            print(f"JSON parse error: {e}")
            # 如果解析失败，使用简单的分词
            keywords = query_text.split()
            keyword_groups = [{"keywords": keywords}]
        
        return {"keyword_groups": keyword_groups}
    except Exception as e:
        print(f"Analysis error: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"分析失败，请重试: {str(e)}"}
        )

def setup_driver():
    """设置和配置Chrome WebDriver"""
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # 无头模式
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    
    # 使用远程 WebDriver
    driver = webdriver.Remote(
        command_executor='http://chrome:4444',
        options=chrome_options
    )
    return driver

def search_google_scholar(keywords, max_pages=5, recent_years=3):
    """使用Selenium搜索谷歌学术，支持翻页和年份筛选
    
    Args:
        keywords: 搜索关键词
        max_pages: 最大搜索页数
        recent_years: 只返回最近几年的论文，设为0表示不限制年份
    
    Returns:
        匹配CCF列表的论文列表
    """
    results = []
    current_year = datetime.datetime.now().year
    min_year = current_year - recent_years if recent_years > 0 else 0
    
    try:
        driver = setup_driver()
        
        # 构建搜索URL，添加年份筛选
        base_url = "https://scholar.google.com/scholar"
        query = keywords
        if recent_years > 0:
            # 添加年份筛选，例如"after:2020"表示2020年之后的文章
            query = f"{query} after:{min_year}"
        
        # 循环搜索多页
        for page in range(max_pages):
            page_start = page * 10
            params = f"?q={'+'.join(query.split())}&start={page_start}&hl=en"
            url = base_url + params
            
            print(f"Searching Google Scholar page {page+1}/{max_pages}: {url}")
            driver.get(url)
            
            # 等待页面加载
            try:
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "gs_ri"))
                )
            except Exception as e:
                print(f"Page loading timed out: {e}")
                # 可能是出现了验证码页面，等待更长时间
                time.sleep(5)
                # 检查是否是验证码页面
                if "sorry" in driver.page_source.lower() or "验证" in driver.page_source or "captcha" in driver.page_source.lower():
                    print("Captcha detected. Pausing for recovery.")
                    # 这里你可能需要人工干预或使用其他方法解决验证码
                    break
            
            # 添加随机延迟，模拟人类行为
            time.sleep(random.uniform(2, 5))
            
            # 提取论文信息
            paper_elements = driver.find_elements(By.CLASS_NAME, "gs_ri")
            
            if not paper_elements:
                print(f"No results found on page {page+1}, stopping search")
                break
            
            page_results = []
            for element in paper_elements:
                try:
                    # 提取标题和链接
                    title_element = element.find_element(By.CLASS_NAME, "gs_rt")
                    title_link = title_element.find_elements(By.TAG_NAME, "a")
                    
                    if title_link:
                        title = title_link[0].text
                        link = title_link[0].get_attribute("href")
                    else:
                        # 没有链接的情况
                        title = title_element.text.replace("[CITATION]", "").strip()
                        link = "#"
                    
                    # 提取作者、期刊/会议和年份
                    meta_element = element.find_element(By.CLASS_NAME, "gs_a").text
                    # 解析元数据
                    authors, venue_info = meta_element.split(" - ", 1) if " - " in meta_element else (meta_element, "")
                    authors_list = [a.strip() for a in authors.split(",")]
                    
                    # 提取年份
                    year_match = re.search(r'\b(19|20)\d{2}\b', venue_info)
                    year = int(year_match.group(0)) if year_match else None
                    
                    # 只处理指定年份范围内的论文
                    if min_year > 0 and (year is None or year < min_year):
                        continue
                    
                    # 检查期刊/会议是否在CCF列表中
                    matched_venue = None
                    venue_level = None
                    venue_type = None
                    venue_url = None
                    
                    for abbr, pattern in venue_patterns.items():
                        if pattern.search(venue_info):
                            matched_venue = abbr
                            venue_info_obj = venues[abbr]
                            venue_level = venue_info_obj.get("level")
                            venue_type = venue_info_obj.get("type")
                            venue_url = venue_info_obj.get("url")
                            break
                    
                    # 如果匹配到CCF推荐的期刊/会议，添加到结果
                    if matched_venue:
                        paper_data = {
                            'title': title,
                            'authors': authors_list,
                            'venue': matched_venue,
                            'year': year,
                            'url': link,
                            'ccf_info': {
                                'type': venue_type,
                                'level': venue_level,
                                'url': venue_url
                            }
                        }
                        page_results.append(paper_data)
                except Exception as e:
                    print(f"Error extracting paper information: {e}")
                    continue
            
            print(f"Found {len(page_results)} CCF papers on page {page+1}")
            results.extend(page_results)
            
            # 如果本页没有找到CCF论文，但有搜索结果，继续搜索下一页
            if not page_results and paper_elements:
                print(f"No CCF papers found on page {page+1}, continuing to next page")
            
            # 随机延迟，避免被封
            if page < max_pages - 1:  # 不是最后一页
                delay = random.uniform(3, 7)
                print(f"Waiting {delay:.2f} seconds before next page...")
                time.sleep(delay)
        
    except Exception as e:
        print(f"Error searching Google Scholar: {e}")
    finally:
        try:
            driver.quit()
        except:
            pass
    
    print(f"Total CCF papers found: {len(results)}")
    return results

@app.get("/search")
async def search(keywords: str, page: int = 0, max_pages: int = 5, recent_years: int = 3):
    try:
        print(f"Searching for: {keywords} (recent {recent_years} years, up to {max_pages} pages)")
        
        # 使用Selenium搜索谷歌学术
        results = search_google_scholar(keywords, max_pages=max_pages, recent_years=recent_years)
        
        # 对结果进行分页
        start_idx = page * 10
        end_idx = start_idx + 10
        paged_results = results[start_idx:end_idx] if results else []
        
        # 统计总页数
        total_pages = (len(results) + 9) // 10  # 向上取整
        
        return {
            "results": paged_results,
            "total": len(results),
            "page": page,
            "total_pages": total_pages
        }
    except Exception as e:
        print(f"Search error: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"搜索失败，请重试: {str(e)}"}
        )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 