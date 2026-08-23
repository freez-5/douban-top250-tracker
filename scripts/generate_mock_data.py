#!/usr/bin/env python3
"""
生成模拟的七月和八月历史数据
基于当前数据创建有变化的模拟数据
"""

import json
import os
import random
import sys
from datetime import datetime

# 设置stdout编码
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# 路径配置
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(PROJECT_DIR, "data")
HISTORY_DIR = os.path.join(DATA_DIR, "history")
CURRENT_FILE = os.path.join(DATA_DIR, "current.json")


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


def generate_mock_data(base_data: dict, date: str, changes_count: int = 5) -> dict:
    """
    生成模拟数据

    Args:
        base_data: 基础数据
        date: 日期
        changes_count: 变化数量

    Returns:
        模拟数据
    """
    movies = base_data['movies'].copy()

    # 随机选择一些电影进行变化
    change_indices = random.sample(range(len(movies)), min(changes_count * 2, len(movies)))

    # 模拟排名变化
    for i in range(0, len(change_indices) - 1, 2):
        idx1 = change_indices[i]
        idx2 = change_indices[i + 1]

        # 交换排名
        movies[idx1]['rank'], movies[idx2]['rank'] = movies[idx2]['rank'], movies[idx1]['rank']

        # 微调评分
        movies[idx1]['rating'] = round(movies[idx1]['rating'] + random.uniform(-0.1, 0.1), 1)
        movies[idx2]['rating'] = round(movies[idx2]['rating'] + random.uniform(-0.1, 0.1), 1)

        # 确保评分在合理范围内
        movies[idx1]['rating'] = max(8.0, min(10.0, movies[idx1]['rating']))
        movies[idx2]['rating'] = max(8.0, min(10.0, movies[idx2]['rating']))

    # 按排名排序
    movies.sort(key=lambda x: x['rank'])

    return {
        "timestamp": f"{date}T00:00:00",
        "count": len(movies),
        "movies": movies,
    }


def main():
    """主函数"""
    print("=" * 50)
    print("生成模拟的七月和八月历史数据")
    print("=" * 50)

    # 确保目录存在
    os.makedirs(HISTORY_DIR, exist_ok=True)

    # 加载当前数据
    current_data = load_json(CURRENT_FILE)
    if not current_data:
        print("错误: 无法加载当前数据")
        return

    print(f"当前数据时间: {current_data['timestamp']}")
    print(f"电影数量: {current_data['count']}")

    # 生成七月数据（7月1日）
    print("\n生成七月数据...")
    july_data = generate_mock_data(current_data, "2025-07-01", changes_count=8)
    july_file = os.path.join(HISTORY_DIR, "2025-07-01.json")
    save_json(july_file, july_data)
    print(f"七月数据: {july_data['count']} 部电影")

    # 生成八月数据（8月1日）
    print("\n生成八月数据...")
    august_data = generate_mock_data(july_data, "2025-08-01", changes_count=6)
    august_file = os.path.join(HISTORY_DIR, "2025-08-01.json")
    save_json(august_file, august_data)
    print(f"八月数据: {august_data['count']} 部电影")

    # 显示一些变化示例
    print("\n" + "=" * 50)
    print("变化示例")
    print("=" * 50)

    # 对比七月和当前数据
    july_movies = {m['title']: m for m in july_data['movies']}
    current_movies = {m['title']: m for m in current_data['movies']}

    july_titles = set(july_movies.keys())
    current_titles = set(current_movies.keys())

    # 找出排名变化
    rank_changes = []
    for title in july_titles & current_titles:
        july_rank = july_movies[title]['rank']
        current_rank = current_movies[title]['rank']
        if july_rank != current_rank:
            rank_changes.append({
                'title': title,
                'july_rank': july_rank,
                'current_rank': current_rank,
                'change': july_rank - current_rank,
            })

    rank_changes.sort(key=lambda x: x['change'], reverse=True)

    print("\n七月到八月的排名变化TOP5:")
    for i, change in enumerate(rank_changes[:5], 1):
        direction = "↑" if change['change'] > 0 else "↓"
        print(f"  {i}. {change['title']}: #{change['july_rank']} → #{change['current_rank']} ({direction}{abs(change['change'])})")

    print("\n✅ 模拟数据生成完成！")
    print(f"七月数据: {july_file}")
    print(f"八月数据: {august_file}")


if __name__ == "__main__":
    main()
