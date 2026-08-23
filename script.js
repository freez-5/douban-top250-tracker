/**
 * 豆瓣Top 250变化追踪器 - 主脚本
 */

// 全局状态
const state = {
    currentData: null,
    historyData: {},
    currentTab: 'changes',
    currentPage: 1,
    pageSize: 25,
    sortBy: 'rank',
    filterRegion: '',
    filterGenre: '',
    searchQuery: '',
};

// DOM元素缓存
const elements = {};

/**
 * 初始化应用
 */
function init() {
    cacheElements();
    bindEvents();
    loadData();
}

/**
 * 缓存DOM元素
 */
function cacheElements() {
    elements.loading = document.getElementById('loading');
    elements.error = document.getElementById('error');
    elements.errorMessage = document.getElementById('errorMessage');

    // 标签页
    elements.navBtns = document.querySelectorAll('.nav-btn');
    elements.tabContents = document.querySelectorAll('.tab-content');

    // 变化追踪
    elements.lastUpdate = document.getElementById('lastUpdate');
    elements.newCount = document.getElementById('newCount');
    elements.exitCount = document.getElementById('exitCount');
    elements.upCount = document.getElementById('upCount');
    elements.downCount = document.getElementById('downCount');
    elements.enteredBadge = document.getElementById('enteredBadge');
    elements.exitedBadge = document.getElementById('exitedBadge');
    elements.rankUpBadge = document.getElementById('rankUpBadge');
    elements.rankDownBadge = document.getElementById('rankDownBadge');
    elements.enteredList = document.getElementById('enteredList');
    elements.exitedList = document.getElementById('exitedList');
    elements.rankUpList = document.getElementById('rankUpList');
    elements.rankDownList = document.getElementById('rankDownList');

    // 排名列表
    elements.sortBy = document.getElementById('sortBy');
    elements.filterRegion = document.getElementById('filterRegion');
    elements.filterGenre = document.getElementById('filterGenre');
    elements.rankingList = document.getElementById('rankingList');
    elements.pagination = document.getElementById('pagination');

    // 历史数据
    elements.historyDate = document.getElementById('historyDate');
    elements.loadHistoryBtn = document.getElementById('loadHistoryBtn');
    elements.historyList = document.getElementById('historyList');

    // 搜索
    elements.searchInput = document.getElementById('searchInput');

    // 弹窗
    elements.modal = document.getElementById('movieModal');
    elements.modalBody = document.getElementById('modalBody');
}

/**
 * 绑定事件
 */
function bindEvents() {
    // 标签页切换
    elements.navBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // 排序和筛选
    elements.sortBy.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        state.currentPage = 1;
        renderRankingList();
    });

    elements.filterRegion.addEventListener('change', (e) => {
        state.filterRegion = e.target.value;
        state.currentPage = 1;
        renderRankingList();
    });

    elements.filterGenre.addEventListener('change', (e) => {
        state.filterGenre = e.target.value;
        state.currentPage = 1;
        renderRankingList();
    });

    // 搜索
    elements.searchInput.addEventListener('input', debounce((e) => {
        state.searchQuery = e.target.value.toLowerCase();
        state.currentPage = 1;
        renderRankingList();
    }, 300));

    // 历史数据加载
    elements.loadHistoryBtn.addEventListener('click', loadHistoryData);

    // 弹窗关闭
    elements.modal.querySelector('.modal-close').addEventListener('click', closeModal);
    elements.modal.querySelector('.modal-overlay').addEventListener('click', closeModal);

    // ESC关闭弹窗
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

/**
 * 加载数据
 */
async function loadData() {
    showLoading();

    try {
        // 加载当前数据
        const response = await fetch('data/current.json');
        if (!response.ok) {
            throw new Error('无法加载数据文件');
        }

        state.currentData = await response.json();

        // 加载历史文件列表
        await loadHistoryList();

        // 渲染界面
        renderAll();
        hideLoading();

    } catch (error) {
        console.error('加载数据失败:', error);
        showError('加载数据失败，请确保数据文件存在。首次使用请先运行爬虫脚本。');
    }
}

/**
 * 加载历史文件列表
 */
async function loadHistoryList() {
    try {
        // 预定义的历史文件列表（包括模拟的七月和八月数据）
        const historyFiles = [
            '2025-07-01',
            '2025-08-01',
            '2026-08-23',
        ];

        // 尝试加载最近30天的历史数据
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            if (!historyFiles.includes(dateStr)) {
                historyFiles.push(dateStr);
            }
        }

        // 按日期排序
        historyFiles.sort((a, b) => b.localeCompare(a));

        // 保存历史文件列表
        state.historyFiles = historyFiles;

    } catch (error) {
        console.error('加载历史列表失败:', error);
        state.historyFiles = [];
    }
}

/**
 * 渲染所有内容
 */
function renderAll() {
    if (!state.currentData) return;

    renderUpdateInfo();
    renderChanges();
    renderFilters();
    renderRankingList();
    renderHistoryList();
}

/**
 * 渲染更新信息
 */
function renderUpdateInfo() {
    const { timestamp, changes } = state.currentData;

    // 更新时间
    elements.lastUpdate.textContent = formatDate(timestamp);

    // 变化统计
    if (changes && changes.has_previous) {
        elements.newCount.textContent = changes.entered?.length || 0;
        elements.exitCount.textContent = changes.exited?.length || 0;
        elements.upCount.textContent = changes.rank_up?.length || 0;
        elements.downCount.textContent = changes.rank_down?.length || 0;
    }
}

/**
 * 渲染变化内容
 */
function renderChanges() {
    const { changes } = state.currentData;

    if (!changes || !changes.has_previous) {
        // 无历史数据
        const emptyHtml = '<div class="empty-state">首次运行，暂无变化数据</div>';
        elements.enteredList.innerHTML = emptyHtml;
        elements.exitedList.innerHTML = emptyHtml;
        elements.rankUpList.innerHTML = emptyHtml;
        elements.rankDownList.innerHTML = emptyHtml;

        elements.enteredBadge.textContent = '0';
        elements.exitedBadge.textContent = '0';
        elements.rankUpBadge.textContent = '0';
        elements.rankDownBadge.textContent = '0';
        return;
    }

    // 新进入
    elements.enteredBadge.textContent = changes.entered?.length || 0;
    elements.enteredList.innerHTML = changes.entered?.length
        ? changes.entered.map(m => createMovieItemHtml(m, 'entered')).join('')
        : '<div class="empty-state">暂无新进入的电影</div>';

    // 掉出
    elements.exitedBadge.textContent = changes.exited?.length || 0;
    elements.exitedList.innerHTML = changes.exited?.length
        ? changes.exited.map(m => createMovieItemHtml(m, 'exited')).join('')
        : '<div class="empty-state">暂无掉出的电影</div>';

    // 排名上升
    elements.rankUpBadge.textContent = changes.rank_up?.length || 0;
    elements.rankUpList.innerHTML = changes.rank_up?.length
        ? changes.rank_up.map(r => createRankChangeHtml(r, 'up')).join('')
        : '<div class="empty-state">暂无排名上升的电影</div>';

    // 排名下降
    elements.rankDownBadge.textContent = changes.rank_down?.length || 0;
    elements.rankDownList.innerHTML = changes.rank_down?.length
        ? changes.rank_down.map(r => createRankChangeHtml(r, 'down')).join('')
        : '<div class="empty-state">暂无排名下降的电影</div>';

    // 绑定点击事件
    bindMovieClickEvents();
}

/**
 * 创建电影条目HTML
 */
function createMovieItemHtml(movie, type) {
    return `
        <div class="movie-item" data-title="${escapeHtml(movie.title)}">
            <div class="movie-poster-small">
                <img src="${movie.cover_url}" alt="${escapeHtml(movie.title)}" loading="lazy"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNTUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
            </div>
            <div class="movie-info">
                <div class="movie-title">${escapeHtml(movie.title)}</div>
                <div class="movie-meta">${movie.year} · ${movie.region} · ${movie.genre}</div>
            </div>
            <div class="movie-rating">
                <i class="fas fa-star"></i>
                ${movie.rating}
            </div>
        </div>
    `;
}

/**
 * 创建排名变化HTML
 */
function createRankChangeHtml(change, type) {
    const arrow = type === 'up' ? '↑' : '↓';
    const changeText = type === 'up' ? `+${change.change}` : change.change;

    return `
        <div class="movie-item" data-title="${escapeHtml(change.title)}">
            <div class="movie-info">
                <div class="movie-title">${escapeHtml(change.title)}</div>
                <div class="movie-meta">
                    排名: ${change.old_rank} → ${change.new_rank}
                </div>
            </div>
            <div class="rank-change ${type}">
                ${arrow} ${Math.abs(change.change)}
            </div>
        </div>
    `;
}

/**
 * 渲染筛选选项
 */
function renderFilters() {
    if (!state.currentData?.movies) return;

    const movies = state.currentData.movies;

    // 提取所有地区
    const regions = [...new Set(movies.map(m => m.region).filter(Boolean))].sort();
    elements.filterRegion.innerHTML = '<option value="">全部地区</option>' +
        regions.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('');

    // 提取所有类型
    const genres = [...new Set(movies.map(m => m.genre).filter(Boolean))].sort();
    elements.filterGenre.innerHTML = '<option value="">全部类型</option>' +
        genres.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('');
}

/**
 * 渲染排名列表
 */
function renderRankingList() {
    if (!state.currentData?.movies) return;

    let movies = [...state.currentData.movies];

    // 搜索筛选
    if (state.searchQuery) {
        movies = movies.filter(m =>
            m.title.toLowerCase().includes(state.searchQuery) ||
            m.original_title.toLowerCase().includes(state.searchQuery) ||
            m.director.toLowerCase().includes(state.searchQuery) ||
            m.actors.some(a => a.toLowerCase().includes(state.searchQuery))
        );
    }

    // 地区筛选
    if (state.filterRegion) {
        movies = movies.filter(m => m.region === state.filterRegion);
    }

    // 类型筛选
    if (state.filterGenre) {
        movies = movies.filter(m => m.genre === state.filterGenre);
    }

    // 排序
    movies.sort((a, b) => {
        switch (state.sortBy) {
            case 'rank':
                return a.rank - b.rank;
            case 'rating':
                return b.rating - a.rating;
            case 'year':
                return parseInt(b.year) - parseInt(a.year);
            case 'rating_count':
                return b.rating_count - a.rating_count;
            default:
                return a.rank - b.rank;
        }
    });

    // 分页
    const totalPages = Math.ceil(movies.length / state.pageSize);
    const startIndex = (state.currentPage - 1) * state.pageSize;
    const pageMovies = movies.slice(startIndex, startIndex + state.pageSize);

    // 渲染列表
    elements.rankingList.innerHTML = pageMovies.map((movie, index) => {
        const globalIndex = startIndex + index;
        const change = getRankChange(movie.title);

        return `
            <div class="ranking-card" data-title="${escapeHtml(movie.title)}">
                <div class="ranking-number ${movie.rank <= 3 ? 'top3' : ''}">
                    ${movie.rank}
                </div>
                <div class="ranking-poster">
                    <img src="${movie.cover_url}" alt="${escapeHtml(movie.title)}" loading="lazy"
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                </div>
                <div class="ranking-details">
                    <div class="ranking-title">${escapeHtml(movie.title)}</div>
                    <div class="ranking-original-title">${escapeHtml(movie.original_title)}</div>
                    <div class="ranking-meta">
                        <span>${movie.year}</span>
                        <span>${movie.region}</span>
                        <span>${movie.genre}</span>
                        <span>导演: ${escapeHtml(movie.director)}</span>
                    </div>
                </div>
                <div class="ranking-stats">
                    <div class="ranking-rating">${movie.rating}</div>
                    <div class="ranking-rating-count">${formatNumber(movie.rating_count)}人评价</div>
                    ${change ? `<div class="ranking-change ${change.type}">${change.text}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');

    // 渲染分页
    renderPagination(totalPages);

    // 绑定点击事件
    bindMovieClickEvents();
}

/**
 * 获取排名变化
 */
function getRankChange(title) {
    const { changes } = state.currentData;
    if (!changes || !changes.has_previous) return null;

    // 检查是否新进入
    if (changes.entered?.some(m => m.title === title)) {
        return { type: 'up', text: '新' };
    }

    // 检查排名变化
    const rankChange = changes.rank_up?.find(r => r.title === title) ||
                       changes.rank_down?.find(r => r.title === title);

    if (rankChange) {
        const type = rankChange.change > 0 ? 'up' : 'down';
        const text = rankChange.change > 0 ? `↑${rankChange.change}` : `↓${Math.abs(rankChange.change)}`;
        return { type, text };
    }

    return null;
}

/**
 * 渲染分页
 */
function renderPagination(totalPages) {
    if (totalPages <= 1) {
        elements.pagination.innerHTML = '';
        return;
    }

    let html = '';

    // 上一页
    html += `<button class="page-btn" ${state.currentPage === 1 ? 'disabled' : ''}
             onclick="goToPage(${state.currentPage - 1})">上一页</button>`;

    // 页码
    const maxVisible = 5;
    let startPage = Math.max(1, state.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
        html += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) {
            html += `<span class="page-btn">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === state.currentPage ? 'active' : ''}"
                 onclick="goToPage(${i})">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="page-btn">...</span>`;
        }
        html += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }

    // 下一页
    html += `<button class="page-btn" ${state.currentPage === totalPages ? 'disabled' : ''}
             onclick="goToPage(${state.currentPage + 1})">下一页</button>`;

    elements.pagination.innerHTML = html;
}

/**
 * 跳转到指定页
 */
function goToPage(page) {
    state.currentPage = page;
    renderRankingList();
    // 滚动到顶部
    elements.rankingList.scrollIntoView({ behavior: 'smooth' });
}

/**
 * 渲染历史列表
 */
function renderHistoryList() {
    if (!state.historyFiles || state.historyFiles.length === 0) {
        elements.historyList.innerHTML = '<div class="empty-state">暂无历史数据</div>';
        return;
    }

    // 添加快速对比区域
    let html = `
        <div class="comparison-section" style="background: var(--bg-primary); padding: 20px; border-radius: var(--radius-lg); margin-bottom: 20px;">
            <h3 style="margin-bottom: 16px;">📊 快速对比</h3>
            <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
                <div>
                    <label style="font-size: 14px; color: var(--text-secondary);">起始日期:</label>
                    <select id="compareDate1" style="padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-left: 8px;">
                        ${state.historyFiles.map(d => `<option value="${d}">${d}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-size: 14px; color: var(--text-secondary);">结束日期:</label>
                    <select id="compareDate2" style="padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-left: 8px;">
                        ${state.historyFiles.map(d => `<option value="${d}">${d}</option>`).join('')}
                    </select>
                </div>
                <button class="btn-primary" onclick="compareSelectedDates()">
                    对比变化
                </button>
            </div>
        </div>
    `;

    // 历史列表
    html += state.historyFiles.map(date => `
        <div class="history-card">
            <div class="history-date">${date}</div>
            <div class="history-actions">
                <button class="btn-secondary" onclick="loadHistoryByDate('${date}')">
                    查看数据
                </button>
            </div>
        </div>
    `).join('');

    elements.historyList.innerHTML = html;
}

/**
 * 对比选中的日期
 */
function compareSelectedDates() {
    const date1 = document.getElementById('compareDate1').value;
    const date2 = document.getElementById('compareDate2').value;

    if (date1 === date2) {
        alert('请选择不同的日期进行对比');
        return;
    }

    compareDates(date1, date2);
}

/**
 * 按日期加载历史数据
 */
async function loadHistoryByDate(date) {
    try {
        const response = await fetch(`data/history/${date}.json`);
        if (!response.ok) {
            throw new Error('历史数据不存在');
        }

        const data = await response.json();
        showHistoryModal(date, data);

    } catch (error) {
        console.error('加载历史数据失败:', error);
        alert('该日期的历史数据不存在');
    }
}

/**
 * 显示历史数据弹窗
 */
function showHistoryModal(date, data) {
    const movieCount = data.movies?.length || 0;
    const avgRating = data.movies?.length
        ? (data.movies.reduce((sum, m) => sum + m.rating, 0) / data.movies.length).toFixed(1)
        : 0;

    elements.modalBody.innerHTML = `
        <h2 class="modal-title">${date} 的数据快照</h2>
        <div class="modal-info">
            <div class="modal-info-item">
                <span class="modal-info-label">电影数量</span>
                <span class="modal-info-value">${movieCount} 部</span>
            </div>
            <div class="modal-info-item">
                <span class="modal-info-label">平均评分</span>
                <span class="modal-info-value">${avgRating}</span>
            </div>
            <div class="modal-info-item">
                <span class="modal-info-label">数据时间</span>
                <span class="modal-info-value">${formatDate(data.timestamp)}</span>
            </div>
        </div>
        <h3 style="margin-bottom: 16px;">前10名电影</h3>
        <div style="max-height: 400px; overflow-y: auto;">
            ${data.movies?.slice(0, 10).map(m => `
                <div class="movie-item">
                    <div class="movie-rank">${m.rank}</div>
                    <div class="movie-info">
                        <div class="movie-title">${escapeHtml(m.title)}</div>
                        <div class="movie-meta">${m.year} · ${m.director}</div>
                    </div>
                    <div class="movie-rating">
                        <i class="fas fa-star"></i>
                        ${m.rating}
                    </div>
                </div>
            `).join('') || ''}
        </div>
    `;

    openModal();
}

/**
 * 加载历史数据（从日期选择器）
 */
function loadHistoryData() {
    const date = elements.historyDate.value;
    if (!date) {
        alert('请选择日期');
        return;
    }
    loadHistoryByDate(date);
}

/**
 * 对比两个日期的数据
 */
async function compareDates(date1, date2) {
    try {
        const [response1, response2] = await Promise.all([
            fetch(`data/history/${date1}.json`),
            fetch(`data/history/${date2}.json`)
        ]);

        if (!response1.ok || !response2.ok) {
            throw new Error('历史数据不存在');
        }

        const data1 = await response1.json();
        const data2 = await response2.json();

        showComparisonModal(date1, data1, date2, data2);

    } catch (error) {
        console.error('对比数据失败:', error);
        alert('无法加载历史数据进行对比');
    }
}

/**
 * 显示对比结果弹窗
 */
function showComparisonModal(date1, data1, date2, data2) {
    const movies1 = Object.fromEntries(data1.movies.map(m => [m.title, m]));
    const movies2 = Object.fromEntries(data2.movies.map(m => [m.title, m]));

    const titles1 = new Set(Object.keys(movies1));
    const titles2 = new Set(Object.keys(movies2));

    // 新进入的电影
    const entered = [...titles2].filter(t => !titles1.has(t)).map(t => movies2[t]);
    entered.sort((a, b) => a.rank - b.rank);

    // 掉出的电影
    const exited = [...titles1].filter(t => !titles2.has(t)).map(t => movies1[t]);
    exited.sort((a, b) => a.rank - b.rank);

    // 排名变化
    const rankChanges = [];
    for (const title of titles1) {
        if (titles2.has(title)) {
            const rank1 = movies1[title].rank;
            const rank2 = movies2[title].rank;
            if (rank1 !== rank2) {
                rankChanges.push({
                    title: title,
                    old_rank: rank1,
                    new_rank: rank2,
                    change: rank1 - rank2,
                    rating: movies2[title].rating,
                });
            }
        }
    }
    rankChanges.sort((a, b) => b.change - a.change);

    const rankUp = rankChanges.filter(r => r.change > 0);
    const rankDown = rankChanges.filter(r => r.change < 0);

    // 生成HTML
    let html = `
        <h2 class="modal-title">${date1} vs ${date2} 变化对比</h2>
        <div class="modal-info">
            <div class="modal-info-item">
                <span class="modal-info-label">新进入</span>
                <span class="modal-info-value">${entered.length} 部</span>
            </div>
            <div class="modal-info-item">
                <span class="modal-info-label">掉出</span>
                <span class="modal-info-value">${exited.length} 部</span>
            </div>
            <div class="modal-info-item">
                <span class="modal-info-label">排名上升</span>
                <span class="modal-info-value">${rankUp.length} 部</span>
            </div>
            <div class="modal-info-item">
                <span class="modal-info-label">排名下降</span>
                <span class="modal-info-value">${rankDown.length} 部</span>
            </div>
        </div>
    `;

    if (entered.length > 0) {
        html += `
            <h3 style="margin: 20px 0 10px;">🆕 新进入榜单</h3>
            <div style="max-height: 200px; overflow-y: auto;">
                ${entered.slice(0, 10).map(m => `
                    <div class="movie-item">
                        <div class="movie-poster-small">
                            <img src="${m.cover_url}" alt="${escapeHtml(m.title)}" loading="lazy"
                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNTUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                        </div>
                        <div class="movie-info">
                            <div class="movie-title">${escapeHtml(m.title)}</div>
                            <div class="movie-meta">排名: #${m.rank} · ${m.year}</div>
                        </div>
                        <div class="movie-rating">
                            <i class="fas fa-star"></i>
                            ${m.rating}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    if (exited.length > 0) {
        html += `
            <h3 style="margin: 20px 0 10px;">📤 掉出榜单</h3>
            <div style="max-height: 200px; overflow-y: auto;">
                ${exited.slice(0, 10).map(m => `
                    <div class="movie-item">
                        <div class="movie-poster-small">
                            <img src="${m.cover_url}" alt="${escapeHtml(m.title)}" loading="lazy"
                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNTUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                        </div>
                        <div class="movie-info">
                            <div class="movie-title">${escapeHtml(m.title)}</div>
                            <div class="movie-meta">排名: #${m.rank} · ${m.year}</div>
                        </div>
                        <div class="movie-rating">
                            <i class="fas fa-star"></i>
                            ${m.rating}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    if (rankUp.length > 0) {
        html += `
            <h3 style="margin: 20px 0 10px;">📈 排名上升TOP10</h3>
            <div style="max-height: 200px; overflow-y: auto;">
                ${rankUp.slice(0, 10).map(r => `
                    <div class="movie-item">
                        <div class="movie-info">
                            <div class="movie-title">${escapeHtml(r.title)}</div>
                            <div class="movie-meta">排名: ${r.old_rank} → ${r.new_rank}</div>
                        </div>
                        <div class="rank-change up">↑${r.change}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    if (rankDown.length > 0) {
        html += `
            <h3 style="margin: 20px 0 10px;">📉 排名下降TOP10</h3>
            <div style="max-height: 200px; overflow-y: auto;">
                ${rankDown.slice(0, 10).map(r => `
                    <div class="movie-item">
                        <div class="movie-info">
                            <div class="movie-title">${escapeHtml(r.title)}</div>
                            <div class="movie-meta">排名: ${r.old_rank} → ${r.new_rank}</div>
                        </div>
                        <div class="rank-change down">↓${Math.abs(r.change)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    elements.modalBody.innerHTML = html;
    openModal();
}

/**
 * 绑定电影点击事件
 */
function bindMovieClickEvents() {
    document.querySelectorAll('.movie-item, .ranking-card').forEach(el => {
        el.addEventListener('click', () => {
            const title = el.dataset.title;
            showMovieDetail(title);
        });
    });
}

/**
 * 显示电影详情
 */
function showMovieDetail(title) {
    const movie = state.currentData.movies.find(m => m.title === title);
    if (!movie) return;

    elements.modalBody.innerHTML = `
        ${movie.cover_url ? `<img class="modal-poster" src="${movie.cover_url}" alt="${escapeHtml(movie.title)}"
            onerror="this.style.display='none'">` : ''}
        <h2 class="modal-title">${escapeHtml(movie.title)}</h2>
        ${movie.original_title ? `<div class="modal-original-title">${escapeHtml(movie.original_title)}</div>` : ''}
        <div class="modal-rating">
            <span class="modal-rating-score">${movie.rating}</span>
            <span class="modal-rating-count">${formatNumber(movie.rating_count)} 人评价</span>
        </div>
        <div class="modal-info">
            <div class="modal-info-item">
                <span class="modal-info-label">排名</span>
                <span class="modal-info-value">#${movie.rank}</span>
            </div>
            <div class="modal-info-item">
                <span class="modal-info-label">年份</span>
                <span class="modal-info-value">${movie.year}</span>
            </div>
            <div class="modal-info-item">
                <span class="modal-info-label">地区</span>
                <span class="modal-info-value">${movie.region}</span>
            </div>
            <div class="modal-info-item">
                <span class="modal-info-label">类型</span>
                <span class="modal-info-value">${movie.genre}</span>
            </div>
            <div class="modal-info-item">
                <span class="modal-info-label">导演</span>
                <span class="modal-info-value">${escapeHtml(movie.director)}</span>
            </div>
            <div class="modal-info-item">
                <span class="modal-info-label">主演</span>
                <span class="modal-info-value">${movie.actors.map(a => escapeHtml(a)).join(', ')}</span>
            </div>
        </div>
        ${movie.quote ? `<div class="modal-quote">"${escapeHtml(movie.quote)}"</div>` : ''}
        ${movie.douban_url ? `<a class="modal-link" href="${movie.douban_url}" target="_blank" rel="noopener">
            <i class="fas fa-external-link-alt"></i> 在豆瓣查看
        </a>` : ''}
    `;

    openModal();
}

/**
 * 切换标签页
 */
function switchTab(tab) {
    state.currentTab = tab;

    // 更新按钮状态
    elements.navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // 更新内容显示
    elements.tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tab}Tab`);
    });
}

/**
 * 加载指定时间段的变化
 */
async function loadPeriodChanges() {
    const period = document.getElementById('periodSelect').value;

    if (period === 'latest') {
        // 显示最新变化
        renderChanges();
        return;
    }

    // 加载指定日期的数据并与当前数据对比
    try {
        const response = await fetch(`data/history/${period}.json`);
        if (!response.ok) {
            throw new Error('历史数据不存在');
        }

        const historicalData = await response.json();
        const currentData = state.currentData;

        if (!currentData) {
            alert('当前数据未加载');
            return;
        }

        // 对比数据
        const changes = compareData(historicalData, currentData);

        // 更新显示
        updateChangesDisplay(changes, period);

    } catch (error) {
        console.error('加载历史数据失败:', error);
        alert('无法加载该时间段的历史数据');
    }
}

/**
 * 对比两个数据集
 */
function compareData(oldData, newData) {
    const oldMovies = Object.fromEntries(oldData.movies.map(m => [m.title, m]));
    const newMovies = Object.fromEntries(newData.movies.map(m => [m.title, m]));

    const oldTitles = new Set(Object.keys(oldMovies));
    const newTitles = new Set(Object.keys(newMovies));

    // 新进入的电影
    const entered = [...newTitles].filter(t => !oldTitles.has(t)).map(t => newMovies[t]);
    entered.sort((a, b) => a.rank - b.rank);

    // 掉出的电影
    const exited = [...oldTitles].filter(t => !newTitles.has(t)).map(t => oldMovies[t]);
    exited.sort((a, b) => a.rank - b.rank);

    // 排名变化
    const rankChanges = [];
    for (const title of oldTitles) {
        if (newTitles.has(title)) {
            const oldRank = oldMovies[title].rank;
            const newRank = newMovies[title].rank;
            if (oldRank !== newRank) {
                rankChanges.push({
                    title: title,
                    old_rank: oldRank,
                    new_rank: newRank,
                    change: oldRank - newRank,
                    rating: newMovies[title].rating,
                    cover_url: newMovies[title].cover_url,
                    year: newMovies[title].year,
                    region: newMovies[title].region,
                    genre: newMovies[title].genre,
                });
            }
        }
    }
    rankChanges.sort((a, b) => b.change - a.change);

    return {
        has_previous: true,
        old_timestamp: oldData.timestamp,
        new_timestamp: newData.timestamp,
        entered: entered,
        exited: exited,
        rank_up: rankChanges.filter(r => r.change > 0),
        rank_down: rankChanges.filter(r => r.change < 0),
        total_changes: entered.length + exited.length + rankChanges.length,
    };
}

/**
 * 更新变化显示
 */
function updateChangesDisplay(changes, period) {
    // 更新时间显示
    elements.lastUpdate.textContent = `${period} 至今`;

    // 更新统计数字
    elements.newCount.textContent = changes.entered?.length || 0;
    elements.exitCount.textContent = changes.exited?.length || 0;
    elements.upCount.textContent = changes.rank_up?.length || 0;
    elements.downCount.textContent = changes.rank_down?.length || 0;

    // 更新徽章
    elements.enteredBadge.textContent = changes.entered?.length || 0;
    elements.exitedBadge.textContent = changes.exited?.length || 0;
    elements.rankUpBadge.textContent = changes.rank_up?.length || 0;
    elements.rankDownBadge.textContent = changes.rank_down?.length || 0;

    // 更新列表
    elements.enteredList.innerHTML = changes.entered?.length
        ? changes.entered.map(m => createMovieItemHtml(m, 'entered')).join('')
        : '<div class="empty-state">暂无新进入的电影</div>';

    elements.exitedList.innerHTML = changes.exited?.length
        ? changes.exited.map(m => createMovieItemHtml(m, 'exited')).join('')
        : '<div class="empty-state">暂无掉出的电影</div>';

    elements.rankUpList.innerHTML = changes.rank_up?.length
        ? changes.rank_up.map(r => createRankChangeHtml(r, 'up')).join('')
        : '<div class="empty-state">暂无排名上升的电影</div>';

    elements.rankDownList.innerHTML = changes.rank_down?.length
        ? changes.rank_down.map(r => createRankChangeHtml(r, 'down')).join('')
        : '<div class="empty-state">暂无排名下降的电影</div>';

    // 绑定点击事件
    bindMovieClickEvents();
}

/**
 * 打开弹窗
 */
function openModal() {
    elements.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * 关闭弹窗
 */
function closeModal() {
    elements.modal.classList.remove('active');
    document.body.style.overflow = '';
}

/**
 * 显示加载状态
 */
function showLoading() {
    elements.loading.style.display = 'flex';
    elements.error.style.display = 'none';
}

/**
 * 隐藏加载状态
 */
function hideLoading() {
    elements.loading.style.display = 'none';
}

/**
 * 显示错误信息
 */
function showError(message) {
    elements.loading.style.display = 'none';
    elements.error.style.display = 'block';
    elements.errorMessage.textContent = message;
}

/**
 * 格式化日期
 */
function formatDate(isoString) {
    if (!isoString) return '--';
    const date = new Date(isoString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * 格式化数字
 */
function formatNumber(num) {
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    }
    return num.toLocaleString();
}

/**
 * HTML转义
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 防抖函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 初始化应用
document.addEventListener('DOMContentLoaded', init);
