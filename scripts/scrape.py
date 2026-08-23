#!/usr/bin/env python3
"""
豆瓣Top 250爬虫脚本
每天自动爬取豆瓣Top 250数据，并与历史数据对比，生成变化报告
"""

import requests
from bs4 import BeautifulSoup
import json
import os
from datetime import datetime, timedelta
import time
import re
import sys

# 设置stdout编码为utf-8，解决Windows下的编码问题
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# 配置
BASE_URL = "https://movie.douban.com/top250"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

# 路径配置
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(PROJECT_DIR, "data")
HISTORY_DIR = os.path.join(DATA_DIR, "history")
CURRENT_FILE = os.path.join(DATA_DIR, "current.json")


def ensure_directories():
    """确保数据目录存在"""
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(HISTORY_DIR, exist_ok=True)


def scrape_page(start: int) -> list:
    """
    爬取单页电影数据

    Args:
        start: 起始位置（0, 25, 50, ...）

    Returns:
        电影列表
    """
    url = f"{BASE_URL}?start={start}&filter="
    print(f"正在爬取: {url}")

    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()
        response.encoding = 'utf-8'
    except requests.RequestException as e:
        print(f"请求失败: {e}")
        return []

    soup = BeautifulSoup(response.text, 'html.parser')
    movies = []

    # 查找所有电影条目
    items = soup.select('.item')
    if not items:
        print(f"未找到电影条目，可能页面结构已变化")
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

    Args:
        item: BeautifulSoup元素

    Returns:
        电影信息字典
    """
    # 排名
    rank_elem = item.select_one('.pic em')
    rank = int(rank_elem.text) if rank_elem else 0

    # 标题
    title_elem = item.select_one('.hd a .title')
    title = title_elem.text.strip() if title_elem else ""

    # 原名（可能有多个title，第二个是原名）
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
    # 提取数字
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
            # 第一行：导演、主演
            first_line = lines[0].strip()
            director_match = re.search(r'导演:\s*([^/\n]+)', first_line)
            if director_match:
                director = director_match.group(1).strip()

            actors_match = re.search(r'主演:\s*([^\n]+)', first_line)
            if actors_match:
                actors_text = actors_match.group(1).strip()
                # 取前3个主演
                actors = [a.strip() for a in actors_text.split('/')[:3]]

        if len(lines) >= 2:
            # 第二行：年份 / 地区 / 类型
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


def scrape_top250() -> dict:
    """
    爬取完整的Top 250数据

    Returns:
        包含时间戳和电影列表的字典
    """
    all_movies = []

    for start in range(0, 250, 25):
        movies = scrape_page(start)
        all_movies.extend(movies)

        # 礼貌性延迟，避免被封
        if start < 225:
            time.sleep(2)

    # 按排名排序
    all_movies.sort(key=lambda x: x['rank'])

    return {
        "timestamp": datetime.now().isoformat(),
        "count": len(all_movies),
        "movies": all_movies,
    }


def load_json(filepath: str) -> dict:
    """加载JSON文件"""
    if not os.path.exists(filepath):
        return None
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"加载文件失败 {filepath}: {e}")
        return None


def save_json(filepath: str, data: dict):
    """保存JSON文件"""
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"已保存: {filepath}")
    except IOError as e:
        print(f"保存文件失败 {filepath}: {e}")


def compare_data(old_data: dict, new_data: dict) -> dict:
    """
    对比新旧数据，生成变化报告

    Args:
        old_data: 旧数据
        new_data: 新数据

    Returns:
        变化报告
    """
    if not old_data or not old_data.get('movies'):
        return {
            "has_previous": False,
            "message": "首次运行，无历史数据可对比",
        }

    old_movies = {m['title']: m for m in old_data['movies']}
    new_movies = {m['title']: m for m in new_data['movies']}

    old_titles = set(old_movies.keys())
    new_titles = set(new_movies.keys())

    # 新进入的电影
    entered_titles = new_titles - old_titles
    entered = [new_movies[t] for t in entered_titles]
    entered.sort(key=lambda x: x['rank'])

    # 掉出的电影
    exited_titles = old_titles - new_titles
    exited = [old_movies[t] for t in exited_titles]
    exited.sort(key=lambda x: x['rank'])

    # 排名变化
    rank_changes = []
    for title in old_titles & new_titles:
        old_rank = old_movies[title]['rank']
        new_rank = new_movies[title]['rank']
        if old_rank != new_rank:
            rank_changes.append({
                "title": title,
                "old_rank": old_rank,
                "new_rank": new_rank,
                "change": old_rank - new_rank,  # 正数表示上升，负数表示下降
                "rating": new_movies[title]['rating'],
            })

    # 按变化幅度排序
    rank_changes.sort(key=lambda x: x['change'], reverse=True)

    # 分离上升和下降
    rank_up = [r for r in rank_changes if r['change'] > 0]
    rank_down = [r for r in rank_changes if r['change'] < 0]

    return {
        "has_previous": True,
        "old_timestamp": old_data.get('timestamp', ''),
        "new_timestamp": new_data.get('timestamp', ''),
        "entered": entered,
        "exited": exited,
        "rank_up": rank_up,
        "rank_down": rank_down,
        "total_changes": len(entered) + len(exited) + len(rank_changes),
    }


def main():
    """主函数"""
    print("=" * 50)
    print("豆瓣Top 250爬虫")
    print("=" * 50)

    # 确保目录存在
    ensure_directories()

    # 加载旧数据
    old_data = load_json(CURRENT_FILE)
    print(f"旧数据时间: {old_data.get('timestamp', '无') if old_data else '无'}")

    # 爬取新数据
    print("\n开始爬取豆瓣Top 250...")
    new_data = scrape_top250()

    if not new_data['movies']:
        print("爬取失败，未获取到任何电影数据")
        return

    print(f"\n成功爬取 {new_data['count']} 部电影")

    # 保存历史快照
    today = datetime.now().strftime('%Y-%m-%d')
    history_file = os.path.join(HISTORY_DIR, f"{today}.json")
    save_json(history_file, new_data)

    # 对比数据
    changes = compare_data(old_data, new_data)

    # 保存变化报告
    new_data['changes'] = changes
    save_json(CURRENT_FILE, new_data)

    # 打印变化摘要
    print("\n" + "=" * 50)
    print("变化摘要")
    print("=" * 50)

    if changes.get('has_previous'):
        print(f"对比时间: {changes['old_timestamp']} -> {changes['new_timestamp']}")
        print(f"新进入: {len(changes['entered'])} 部")
        print(f"掉出: {len(changes['exited'])} 部")
        print(f"排名上升: {len(changes['rank_up'])} 部")
        print(f"排名下降: {len(changes['rank_down'])} 部")

        if changes['entered']:
            print("\n🆕 新进入榜单:")
            for m in changes['entered'][:5]:
                print(f"  #{m['rank']} {m['title']} ({m['year']}) ⭐{m['rating']}")

        if changes['exited']:
            print("\n📤 掉出榜单:")
            for m in changes['exited'][:5]:
                print(f"  #{m['rank']} {m['title']} ({m['year']}) ⭐{m['rating']}")

        if changes['rank_up']:
            print("\n📈 排名上升TOP5:")
            for r in changes['rank_up'][:5]:
                print(f"  {r['title']}: #{r['old_rank']} -> #{r['new_rank']} (+{r['change']})")

        if changes['rank_down']:
            print("\n📉 排名下降TOP5:")
            for r in changes['rank_down'][:5]:
                print(f"  {r['title']}: #{r['old_rank']} -> #{r['new_rank']} ({r['change']})")
    else:
        print(changes.get('message', ''))

    print("\n✅ 完成！")


if __name__ == "__main__":
    main()
