// 侧边栏折叠控制
(function() {
    'use strict';

    const collapseAllBtn = document.getElementById('collapseAllBtn');
    const collapseCurrentBtn = document.getElementById('collapseCurrentBtn');
    const sidebarNav = document.getElementById('sidebarNav');

    if (!collapseAllBtn || !collapseCurrentBtn || !sidebarNav) return;

    // 获取所有 details 元素（分类和子分类）
    function getAllDetails() {
        return sidebarNav.querySelectorAll('details.sidebar-details');
    }

    // 获取当前激活的分类 details（当前页面所在的分类路径）
    function getActiveDetails() {
        const active = sidebarNav.querySelector('.sidebar-category-title.active, .sidebar-subcategory-title.active');
        if (!active) return [];
        const details = [];
        let el = active.closest('details.sidebar-details');
        while (el) {
            details.push(el);
            el = el.parentElement ? el.parentElement.closest('details.sidebar-details') : null;
        }
        return details;
    }

    // 保存展开状态到 localStorage
    function saveOpenState() {
        const allDetails = getAllDetails();
        const state = {};
        allDetails.forEach(function(d) {
            const link = d.querySelector('summary a');
            if (link) {
                state[link.getAttribute('href')] = d.hasAttribute('open');
            }
        });
        try {
            localStorage.setItem('sidebarOpenState', JSON.stringify(state));
        } catch(e) {}
    }

    // 恢复展开状态 - 先全部展开，再折叠不需要的
    function restoreOpenState() {
        try {
            const saved = localStorage.getItem('sidebarOpenState');
            if (!saved) return;
            const state = JSON.parse(saved);
            const allDetails = getAllDetails();
            allDetails.forEach(function(d) {
                const link = d.querySelector('summary a');
                if (link) {
                    const href = link.getAttribute('href');
                    if (state[href] === false) {
                        d.removeAttribute('open');
                    }
                }
            });
        } catch(e) {}
    }

    // 监听 details 的 toggle 事件，保存状态
    sidebarNav.addEventListener('toggle', function(e) {
        if (e.target.tagName === 'DETAILS') {
            saveOpenState();
        }
    }, true);

    // 页面加载时恢复状态
    // 由于模板中所有 details 默认都有 open 属性（服务端渲染时全部展开）
    // JS 只需要折叠不需要的，这样只会减少高度，不会增加高度，避免抽动
    restoreOpenState();

    // 全部折叠
    collapseAllBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const allDetails = getAllDetails();
        allDetails.forEach(function(d) {
            d.removeAttribute('open');
        });
        saveOpenState();
    });

    // 折叠当前（折叠当前激活的分类路径）
    collapseCurrentBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const activeDetails = getActiveDetails();
        if (activeDetails.length > 0) {
            activeDetails.forEach(function(d) {
                d.removeAttribute('open');
            });
        } else {
            const allDetails = getAllDetails();
            allDetails.forEach(function(d) {
                d.removeAttribute('open');
            });
        }
        saveOpenState();
    });

})();
