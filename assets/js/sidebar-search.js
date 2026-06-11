// 侧边栏搜索功能
(function() {
    const searchInput = document.getElementById('sidebarSearchInput');
    const searchResults = document.getElementById('sidebarSearchResults');
    const sidebarNav = document.getElementById('sidebarNav');
    
    if (!searchInput) return;
    
    // 从全局变量获取文章数据
    const postsData = window.__sidebarPosts || [];
    
    function performSearch(query) {
        if (!query || query.length < 1) {
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
            if (sidebarNav) sidebarNav.style.display = '';
            return;
        }
        
        const q = query.toLowerCase();
        const results = postsData.filter(function(post) {
            return post.title.toLowerCase().includes(q) ||
                   (post.summary && post.summary.toLowerCase().includes(q)) ||
                   (post.tags && post.tags.some(function(t) { return t.toLowerCase().includes(q); })) ||
                   (post.categories && post.categories.some(function(c) { return c.toLowerCase().includes(q); }));
        });
        
        if (results.length > 0) {
            searchResults.innerHTML = results.map(function(post) {
                var summaryHtml = '';
                if (post.summary) {
                    summaryHtml = '<span class="sidebar-search-item-summary">' + post.summary.substring(0, 60) + '...</span>';
                }
                return '<a href="' + post.permalink + '" class="sidebar-search-item">' +
                    '<span class="sidebar-search-item-title">' + post.title + '</span>' +
                    summaryHtml +
                    '</a>';
            }).join('');
            searchResults.classList.add('active');
            if (sidebarNav) sidebarNav.style.display = 'none';
        } else {
            searchResults.innerHTML = '<div class="sidebar-search-empty">未找到相关文章</div>';
            searchResults.classList.add('active');
            if (sidebarNav) sidebarNav.style.display = 'none';
        }
    }
    
    // 防抖
    var debounceTimer;
    searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function() { performSearch(searchInput.value); }, 200);
    });
    
    // 点击搜索结果后清空搜索
    searchResults.addEventListener('click', function(e) {
        if (e.target.closest('.sidebar-search-item')) {
            searchInput.value = '';
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
            if (sidebarNav) sidebarNav.style.display = '';
        }
    });
})();
