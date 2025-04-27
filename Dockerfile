# 使用 Python 3.9 作为基础镜像
FROM m.daocloud.io/docker.io/library/python:3.9-slim

# 设置工作目录
WORKDIR /app

# 复制项目文件
COPY requirements.txt .
COPY app.py .
COPY ccf_categories.json .
COPY templates/ templates/
COPY static/ static/

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install selenium webdriver_manager

# 设置环境变量
ENV PYTHONUNBUFFERED=1

# 暴露端口
EXPOSE 25427

# 启动命令
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "25427"] 