#!/usr/bin/env python3
"""
从Wayback Machine爬取豆瓣Top 250历史数据
"""

import requests
from bs4 import BeautifulSoup
import json
import os
from datetime import datetime
import time
import re
import sys

# 设置stdout编码
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# 路径配置
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(PROJECT_DIR, "data")
HISTORY_DIR = os.path.join(DATA_DIR, "history")

# Wayback Machine快照URL
WAYBACK_SNAPSHOTS = {
    "2025-06-27": "http://web.archive.org/web/20250627133518/https://movie.douban.com/top250",
    "2025-08-24": "http://web.archive.org/web/20250824095446/https://movie.douban.com/top250",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}


def scrape_wayback_page(url: str, start: int, retry_count: int = 0) -> list:
    """
    从Wayback Machine爬取单页电影数据
    """
    # 构建分页URL
    if start == 0:
        page_url = url
    else:
        page_url = f"{url}?start={start}&filter="

    print(f"正在爬取: {page_url}")

    try:
        response = requests.get(page_url, headers=HEADERS, timeout=30)
        response.raise_for_status()
        response.encoding = 'utf-8'
    except requests.RequestException as e:
        print(f"请求失败: {e}")
        # 如果是429错误且重试次数少于3次，等待后重试
        if "429" in str(e) and retry_count < 3:
            wait_time = (retry_count + 1) * 30  # 30秒、60秒、90秒
            print(f"等待 {wait_time} 秒后重试...")
            time.sleep(wait_time)
            return scrape_wayback_page(url, start, retry_count + 1)
        return []

    soup = BeautifulSoup(response.text, 'html.parser')
    movies = []

    # 查找所有电影条目
    items = soup.select('.item')
    if not items:
        print(f"未找到电影条目")
        return []

    for item in items:
        try:
            movie = parse_movie_item(item)
            if movie:
                movies.append(movie)
        except Exception as e:
            print(f"解析电影条目失败: {e}")
            continue

    return movies


def parse_movie_item(item) -> dict:
    """
    解析单个电影条目
    """
    # 排名
    rank_elem = item.select_one('.pic em')
    rank = int(rank_elem.text) if rank_elem else 0

    # 标题
    title_elem = item.select_one('.hd a .title')
    title = title_elem.text.strip() if title_elem else ""

    # 原名
    titles = item.select('.hd a .title')
    original_title = titles[1].text.strip().lstrip('/').strip() if len(titles) > 1 else ""

    # 其他信息
    other_info_elem = item.select_one('.hd a .other')
    other_info = other_info_elem.text.strip().lstrip('/').strip() if other_info_elem else ""

    # 评分
    rating_elem = item.select_one('.rating_num')
    rating = float(rating_elem.text.strip()) if rating_elem and rating_elem.text.strip() else 0.0

    # 评价人数
    rating_count_elem = item.select_one('.star span:last-child')
    rating_count_text = rating_count_elem.text.strip() if rating_count_elem else "0"
    rating_count_match = re.search(r'(\d+)', rating_count_text)
    rating_count = int(rating_count_match.group(1)) if rating_count_match else 0

    # 详细信息行
    info_elem = item.select_one('.bd p:first-child')
    info_text = info_elem.text.strip() if info_elem else ""

    # 解析年份、地区、类型
    year = ""
    region = ""
    genre = ""
    director = ""
    actors = []

    if info_text:
        lines = info_text.split('\n')
        if len(lines) >= 1:
            first_line = lines[0].strip()
            director_match = re.search(r'导演:\s*([^/\n]+)', first_line)
            if director_match:
                director = director_match.group(1).strip()

            actors_match = re.search(r'主演:\s*([^\n]+)', first_line)
            if actors_match:
                actors_text = actors_match.group(1).strip()
                actors = [a.strip() for a in actors_text.split('/')[:3]]

        if len(lines) >= 2:
            second_line = lines[1].strip()
            parts = [p.strip() for p in second_line.split('/')]
            if len(parts) >= 1:
                year = parts[0].strip()
            if len(parts) >= 2:
                region = parts[1].strip()
            if len(parts) >= 3:
                genre = parts[2].strip()

    # 豆瓣链接
    link_elem = item.select_one('.hd a')
    douban_url = link_elem['href'] if link_elem and link_elem.get('href') else ""

    # 封面图片
    img_elem = item.select_one('.pic img')
    cover_url = img_elem['src'] if img_elem and img_elem.get('src') else ""

    # 简介
    quote_elem = item.select_one('.quote .inq')
    quote = quote_elem.text.strip() if quote_elem else ""

    return {
        "rank": rank,
        "title": title,
        "original_title": original_title,
        "other_info": other_info,
        "rating": rating,
        "rating_count": rating_count,
        "year": year,
        "region": region,
        "genre": genre,
        "director": director,
        "actors": actors,
        "quote": quote,
        "douban_url": douban_url,
        "cover_url": cover_url,
    }


def scrape_wayback_top250(snapshot_url: str, date: str) -> dict:
    """
    从Wayback Machine爬取完整的Top 250数据
    """
    all_movies = []

    for start in range(0, 250, 25):
        movies = scrape_wayback_page(snapshot_url, start)
        all_movies.extend(movies)

        # 礼貌性延迟，增加到10秒
        if start < 225:
            time.sleep(10)

    # 按排名排序
    all_movies.sort(key=lambda x: x['rank'])

    return {
        "timestamp": f"{date}T00:00:00",
        "count": len(all_movies),
        "movies": all_movies,
    }


def save_json(filepath: str, data: dict):
    """保存JSON文件"""
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"已保存: {filepath}")
    except IOError as e:
        print(f"保存文件失败 {filepath}: {e}")


def main():
    """主函数"""
    print("=" * 50)
    print("从Wayback Machine爬取豆瓣Top 250历史数据")
    print("=" * 50)

    # 确保目录存在
    os.makedirs(HISTORY_DIR, exist_ok=True)

    for date, url in WAYBACK_SNAPSHOTS.items():
        print(f"\n正在爬取 {date} 的数据...")
        data = scrape_wayback_top250(url, date)

        if data['movies']:
            # 保存到历史目录
            history_file = os.path.join(HISTORY_DIR, f"{date}.json")
            save_json(history_file, data)
            print(f"成功爬取 {data['count']} 部电影")
        else:
            print(f"爬取 {date} 数据失败")

        # 礼貌性延迟，增加到30秒
        time.sleep(30)

    print("\n✅ 完成！")


if __name__ == "__main__":
    main()
