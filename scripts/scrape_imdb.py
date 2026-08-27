#!/usr/bin/env python3
"""
IMDB Top 250 爬虫脚本
使用 IMDB 官方数据集计算 Top 250 排名
数据来源: https://datasets.imdbws.com/
"""
import csv
import gzip
import json
import os
import sys
import time
from datetime import datetime
from io import BytesIO

import requests

# Windows 控制台编码修复
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# 数据目录
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, 'data', 'imdb')
HISTORY_DIR = os.path.join(DATA_DIR, 'history')

# 确保目录存在
os.makedirs(HISTORY_DIR, exist_ok=True)

# IMDB 数据集 URL
RATINGS_URL = 'https://datasets.imdbws.com/title.ratings.tsv.gz'
BASICS_URL = 'https://datasets.imdbws.com/title.basics.tsv.gz'

# IMDB Top 250 参数
MIN_VOTES = 25000  # 最低投票数
TOP_N = 250        # 取前 N 名


def download_tsv(url, description):
    """下载并解压 TSV 文件"""
    print(f"  下载 {description}...")
    for attempt in range(3):
        try:
            response = requests.get(url, timeout=120)
            response.raise_for_status()
            print(f"    下载完成: {len(response.content) / 1024 / 1024:.1f} MB")

            # 解压并解析 TSV
            rows = []
            with gzip.open(BytesIO(response.content), 'rt', encoding='utf-8') as f:
                reader = csv.DictReader(f, delimiter='\t')
                for row in reader:
                    rows.append(row)

            print(f"    解析完成: {len(rows)} 条记录")
            return rows

        except Exception as e:
            print(f"    下载失败 (第{attempt + 1}次): {e}")
            if attempt < 2:
                time.sleep(10 * (attempt + 1))

    return None


def calculate_weighted_rating(vote_count, average_rating, m=MIN_VOTES):
    """
    计算 IMDB 加权评分 (贝叶斯估计)
    公式: WR = (v/(v+m)) * R + (m/(v+m)) * C
    其中:
      v = 投票数
      m = 最低投票数门槛
      R = 平均评分
      C = 所有电影的平均评分
    """
    # C 会在主函数中计算并传入
    pass


def parse_imdb_top250():
    """
    从 IMDB 数据集计算 Top 250
    """
    print("开始计算 IMDB Top 250...")
    print()

    # 1. 下载评分数据
    ratings_data = download_tsv(RATINGS_URL, "评分数据")
    if not ratings_data:
        print("无法下载评分数据！")
        return []

    # 2. 下载基础数据
    basics_data = download_tsv(BASICS_URL, "基础数据")
    if not basics_data:
        print("无法下载基础数据！")
        return []

    # 3. 建立基础数据索引 (按 tconst)
    print("  建立索引...")
    basics_dict = {}
    for row in basics_data:
        tconst = row.get('tconst', '')
        if tconst:
            basics_dict[tconst] = row

    # 4. 筛选电影并计算加权评分
    print("  筛选电影并计算加权评分...")

    # 首先计算所有电影的平均评分 C
    total_rating = 0
    total_count = 0
    movie_ratings = []

    for row in ratings_data:
        tconst = row.get('tconst', '')
        try:
            average_rating = float(row.get('averageRating', 0))
            num_votes = int(row.get('numVotes', 0))
        except (ValueError, TypeError):
            continue

        # 检查是否是电影
        basic = basics_dict.get(tconst)
        if not basic:
            continue

        title_type = basic.get('titleType', '')
        if title_type != 'movie':
            continue

        # 排除成人内容
        is_adult = basic.get('isAdult', '0')
        if is_adult == '1':
            continue

        # 检查投票数
        if num_votes >= MIN_VOTES:
            total_rating += average_rating
            total_count += 1
            movie_ratings.append({
                'tconst': tconst,
                'average_rating': average_rating,
                'num_votes': num_votes,
                'basic': basic
            })

    if total_count == 0:
        print("没有符合条件的电影！")
        return []

    # 计算平均评分 C
    C = total_rating / total_count
    print(f"  所有符合条件的电影平均评分 C = {C:.2f}")

    # 计算加权评分
    m = MIN_VOTES
    for movie in movie_ratings:
        v = movie['num_votes']
        R = movie['average_rating']
        # WR = (v/(v+m)) * R + (m/(v+m)) * C
        weighted_rating = (v / (v + m)) * R + (m / (v + m)) * C
        movie['weighted_rating'] = weighted_rating

    # 5. 按加权评分排序，取前 250
    movie_ratings.sort(key=lambda x: x['weighted_rating'], reverse=True)
    top_250 = movie_ratings[:TOP_N]

    print(f"  筛选出 Top {len(top_250)} 部电影")

    # 6. 构建最终数据
    movies = []
    for rank, movie in enumerate(top_250, 1):
        basic = movie['basic']
        tconst = movie['tconst']

        # 提取基本信息
        title = basic.get('primaryTitle', '')
        original_title = basic.get('originalTitle', title)
        year = basic.get('startYear', '\\N')
        if year == '\\N':
            year = ''
        runtime = basic.get('runtimeMinutes', '\\N')
        if runtime == '\\N':
            runtime = ''
        genres = basic.get('genres', '\\N')
        if genres == '\\N':
            genres = ''
        genre = genres.replace(',', ' ')

        # 构建 IMDB URL
        imdb_url = f"https://www.imdb.com/title/{tconst}/"

        # 封面图 URL (使用 IMDB 的图片格式)
        cover_url = f"https://m.media-amazon.com/images/M/{tconst}.jpg"

        movies.append({
            'rank': rank,
            'title': title,
            'original_title': original_title,
            'other_info': '',
            'rating': round(movie['weighted_rating'], 1),
            'rating_count': movie['num_votes'],
            'year': year,
            'region': '',
            'genre': genre,
            'director': '',  # 数据集中没有导演信息
            'actors': [],
            'quote': '',
            'imdb_url': imdb_url,
            'cover_url': cover_url,
            'tconst': tconst
        })

    print(f"\n成功计算 {len(movies)} 部电影")
    return movies


def compare_data(old_data, new_data):
    """对比新旧数据，生成变化报告"""
    old_movies = old_data.get('movies', [])
    new_movies = new_data.get('movies', [])

    # 按标题建立索引
    old_dict = {m['title']: m for m in old_movies}
    new_dict = {m['title']: m for m in new_movies}

    old_titles = set(old_dict.keys())
    new_titles = set(new_dict.keys())

    # 新进入的电影
    entered_titles = new_titles - old_titles
    entered = [new_dict[t] for t in entered_titles]
    entered.sort(key=lambda x: x['rank'])

    # 掉出的电影
    exited_titles = old_titles - new_titles
    exited = [old_dict[t] for t in exited_titles]
    exited.sort(key=lambda x: x['rank'])

    # 排名变化
    rank_up = []
    rank_down = []

    for title in old_titles & new_titles:
        old_rank = old_dict[title]['rank']
        new_rank = new_dict[title]['rank']
        change = old_rank - new_rank  # 正数=排名上升，负数=排名下降

        if change != 0:
            item = {
                'title': title,
                'old_rank': old_rank,
                'new_rank': new_rank,
                'change': change,
                'rating': new_dict[title]['rating']
            }
            if change > 0:
                rank_up.append(item)
            else:
                rank_down.append(item)

    # 按变化幅度排序
    rank_up.sort(key=lambda x: x['change'], reverse=True)
    rank_down.sort(key=lambda x: x['change'])

    return {
        'has_previous': True,
        'old_timestamp': old_data.get('timestamp', ''),
        'new_timestamp': new_data.get('timestamp', ''),
        'entered': entered,
        'exited': exited,
        'rank_up': rank_up,
        'rank_down': rank_down,
        'total_changes': len(entered) + len(exited) + len(rank_up) + len(rank_down)
    }


def save_data(movies, changes):
    """保存数据到文件"""
    timestamp = datetime.now().isoformat()

    # 完整数据
    full_data = {
        'timestamp': timestamp,
        'count': len(movies),
        'movies': movies,
        'changes': changes
    }

    # 保存当前数据
    current_path = os.path.join(DATA_DIR, 'current.json')
    with open(current_path, 'w', encoding='utf-8') as f:
        json.dump(full_data, f, ensure_ascii=False, indent=2)
    print(f"当前数据已保存到: {current_path}")

    # 保存历史快照
    date_str = datetime.now().strftime('%Y-%m-%d')
    history_path = os.path.join(HISTORY_DIR, f'{date_str}.json')

    history_data = {
        'timestamp': timestamp,
        'count': len(movies),
        'movies': movies
    }

    with open(history_path, 'w', encoding='utf-8') as f:
        json.dump(history_data, f, ensure_ascii=False, indent=2)
    print(f"历史快照已保存到: {history_path}")


def load_previous_data():
    """加载上一次的数据用于对比"""
    current_path = os.path.join(DATA_DIR, 'current.json')
    if os.path.exists(current_path):
        try:
            with open(current_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"加载历史数据失败: {e}")
    return None


def main():
    """主函数"""
    print("=" * 50)
    print("IMDB Top 250 计算脚本")
    print("=" * 50)
    print(f"运行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"数据来源: IMDB 官方数据集")
    print(f"最低投票数: {MIN_VOTES:,}")
    print()

    # 计算 Top 250
    movies = parse_imdb_top250()

    if not movies:
        print("未能获取到任何电影数据！")
        sys.exit(1)

    # 加载旧数据用于对比
    old_data = load_previous_data()

    # 生成变化报告
    if old_data and old_data.get('movies'):
        print("\n正在对比数据变化...")
        changes = compare_data(old_data, {
            'timestamp': datetime.now().isoformat(),
            'movies': movies
        })
        print(f"  新进入: {len(changes['entered'])} 部")
        print(f"  掉出: {len(changes['exited'])} 部")
        print(f"  排名上升: {len(changes['rank_up'])} 部")
        print(f"  排名下降: {len(changes['rank_down'])} 部")
    else:
        print("\n首次运行，无历史数据可对比")
        changes = {
            'has_previous': False,
            'message': '首次运行，无历史数据可对比'
        }

    # 保存数据
    save_data(movies, changes)

    # 显示前 10 名
    print("\n" + "=" * 50)
    print("Top 10 预览:")
    print("=" * 50)
    for movie in movies[:10]:
        print(f"  {movie['rank']:3d}. {movie['title']} ({movie['year']}) - 评分: {movie['rating']}")

    print("\n" + "=" * 50)
    print("计算完成！")
    print("=" * 50)


if __name__ == '__main__':
    main()
