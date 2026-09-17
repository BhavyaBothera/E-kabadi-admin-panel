/* ============================================================
   E-KABADI COMMAND CENTER
   Shared UI Components
   File: js/components.js
   ============================================================ */

(function () {
    "use strict";

    const ICONS = {
        dashboard:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
        users:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
        collector:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 17h11V5H3zM14 9h4l3 3v5h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>`,
        pickup:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 17h2M7 17h10M19 17h2M5 17V9l3-4h8l3 4v8M8 9h8"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`,
        recycle:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m7 7 3-4 3 4M10 3v7M17 10h5l-3 5M22 10l-6-1M7 17l-4 4M3 21l2-6M7 17h7a4 4 0 0 0 3-7M10 10a4 4 0 0 0-3 7"/></svg>`,
        wallet:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7h17a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14M17 14h5"/><circle cx="17" cy="14" r="1"/></svg>`,
        gift:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="8" width="18" height="13" rx="1"/><path d="M12 8v13M3 12h18M12 8H8.5a2.5 2.5 0 1 1 2.5-2.5V8ZM12 8h3.5A2.5 2.5 0 1 0 13 5.5V8Z"/></svg>`,
        chart:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19V5M4 19h17m-14-4 4-4 3 2 5-6M19 7v4h-4"/></svg>`,
        alert:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.3 3.5 2.4 17a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>`,
        settings:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.8 1.8-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V20h-2.55v-.11a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-1.8-1.8.06-.06A1.7 1.7 0 0 0 8.2 15a1.7 1.7 0 0 0-1.55-1H6.5v-2.55h.11a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.8-1.8.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1-1.55V5h2.55v.11a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.8 1.8-.06.06A1.7 1.7 0 0 0 19.8 10c.16.58.69 1 1.29 1h.11v2.55h-.11A1.7 1.7 0 0 0 19.4 15Z"/></svg>`,
        search:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>`,
        bell:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>`,
        menu:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`,
        close:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 6 12 12M18 6 6 18"/></svg>`,
        chevron:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>`,
        logout:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>`,
        user:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`,
        help:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.3 1.75c-.9.85-1.8 1.25-1.8 2.75M12 17h.01"/></svg>`,
        leaf:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 4C10 4 4 9 4 16c0 2.2 1.8 4 4 4 7 0 12-6 12-16Z"/><path d="M4 20c2-5 6-8 11-10"/></svg>`,
        arrow:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>`
    };

    function icon(name, className="") {
        return `<span class="icon ${className}">${ICONS[name] || ""}</span>`;
    }

    const PAGE_CONFIG = {
        "dashboard.html":{title:"Dashboard",section:"Overview"},
        "citizens.html":{title:"Citizens",section:"Management"},
        "collectors.html":{title:"Collectors",section:"Management"},
        "pickups.html":{title:"Pickup Operations",section:"Operations"},
        "scrap.html":{title:"Scrap & Rates",section:"Operations"},
        "payments.html":{title:"Payments",section:"Operations"},
        "rewards.html":{title:"Rewards",section:"Engagement"},
        "analytics.html":{title:"Analytics",section:"Intelligence"},
        "issues.html":{title:"Issues & Support",section:"Intelligence"},
        "settings.html":{title:"Settings",section:"System"}
    };

    const NAVIGATION = [
        {section:"Overview",items:[{href:"dashboard.html",label:"Dashboard",icon:"dashboard"}]},
        {section:"Management",items:[{href:"citizens.html",label:"Citizens",icon:"users"},{href:"collectors.html",label:"Collectors",icon:"collector"}]},
        {section:"Operations",items:[{href:"pickups.html",label:"Pickups",icon:"pickup"},{href:"scrap.html",label:"Scrap & Rates",icon:"recycle"},{href:"payments.html",label:"Payments",icon:"wallet"}]},
        {section:"Engagement",items:[{href:"rewards.html",label:"Rewards",icon:"gift"}]},
        {section:"Intelligence",items:[{href:"analytics.html",label:"Analytics",icon:"chart"},{href:"issues.html",label:"Issues",icon:"alert"}]},
        {section:"System",items:[{href:"settings.html",label:"Settings",icon:"settings"}]}
    ];

    function getCurrentPage(){
        const page=window.location.pathname.split("/").pop();
        return page || "dashboard.html";
    }

    function getPageConfig(){
        return PAGE_CONFIG[getCurrentPage()] || {title:"E-Kabadi",section:"Command Center"};
    }

    function renderSidebar(){
        const container=document.getElementById("appSidebar");
        if(!container)return;
        const currentPage=getCurrentPage();
        let navHTML="";
        NAVIGATION.forEach(group=>{
            navHTML+=`<div class="nav-section"><div class="nav-section-title">${group.section}</div>`;
            group.items.forEach(item=>{
                const active=currentPage===item.href?"active":"";
                navHTML+=`<a href="${item.href}" class="nav-link ${active}" data-page="${item.href}">${icon(item.icon,"nav-icon")}<span>${item.label}</span></a>`;
            });
            navHTML+=`</div>`;
        });
        container.innerHTML=`<aside class="sidebar" id="mainSidebar"><div class="sidebar-brand"><a href="dashboard.html" class="brand-link"><div class="brand-logo">${icon("leaf")}</div><div class="brand-text"><strong>E-Kabadi</strong><span>Command Center</span></div></a><button class="sidebar-close" id="sidebarClose" aria-label="Close menu">${icon("close")}</button></div><div class="sidebar-status"><span class="status-dot"></span><div><strong>System Online</strong><small>All services operational</small></div></div><nav class="sidebar-nav">${navHTML}</nav><div class="sidebar-footer"><div class="sidebar-help"><div class="help-icon">${icon("help")}</div><div><strong>Need help?</strong><span>Check system issues</span></div></div><button class="sidebar-logout" id="sidebarLogout">${icon("logout")}<span>Sign out</span></button><div class="sidebar-version">E-Kabadi v1.0.0 · Prototype</div></div></aside><div class="sidebar-overlay" id="sidebarOverlay"></div>`;
        bindSidebarEvents();
    }

    function renderTopbar(){
        const container=document.getElementById("appTopbar");
        if(!container)return;
        const page=getPageConfig();
        const admin=typeof getCurrentAdmin==="function"?getCurrentAdmin():{name:"Admin",role:"Super Admin",avatar:"A"};
        const adminName=admin?.name||"Admin";
        const adminRole=admin?.role||"Super Admin";
        const adminAvatar=admin?.avatar||getInitials(adminName);
        const unreadCount=typeof getUnreadNotificationCount==="function"?getUnreadNotificationCount():0;
        container.innerHTML=`<header class="topbar"><div class="topbar-left"><button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Open menu">${icon("menu")}</button><div class="page-heading"><div class="breadcrumb"><span>Command Center</span><span class="breadcrumb-separator">/</span><strong>${page.title}</strong></div><h1>${page.title}</h1></div></div><div class="topbar-right"><div class="global-search">${icon("search")}<input type="text" id="globalSearch" placeholder="Search anything..." autocomplete="off"/><kbd>⌘ K</kbd></div><div class="notification-wrapper"><button class="topbar-icon-btn" id="notificationBtn" aria-label="Notifications">${icon("bell")}${unreadCount>0?`<span class="notification-count">${unreadCount>9?"9+":unreadCount}</span>`:""}</button><div class="notification-dropdown" id="notificationDropdown"></div></div><div class="topbar-divider"></div><div class="user-menu-wrapper"><button class="user-menu-btn" id="userMenuBtn"><div class="user-avatar">${escapeHTML(adminAvatar)}</div><div class="user-info"><strong>${escapeHTML(adminName)}</strong><span>${escapeHTML(adminRole)}</span></div>${icon("chevron","user-chevron")}</button><div class="user-dropdown" id="userDropdown"><div class="user-dropdown-header"><div class="user-avatar large">${escapeHTML(adminAvatar)}</div><div><strong>${escapeHTML(adminName)}</strong><span>${escapeHTML(adminRole)}</span></div></div><div class="dropdown-divider"></div><a href="settings.html">${icon("settings")}<span>Settings</span></a><a href="issues.html">${icon("help")}<span>Help & Support</span></a><div class="dropdown-divider"></div><button id="topbarLogout" class="danger">${icon("logout")}<span>Sign out</span></button></div></div></div></header>`;
        renderNotifications();
        bindTopbarEvents();
    }

    function renderNotifications(){
        const dropdown=document.getElementById("notificationDropdown");
        if(!dropdown)return;
        let notifications=typeof storageGetNotifications==="function"?storageGetNotifications():[];
        notifications=notifications.slice().sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)).slice(0,6);
        const html=notifications.length?notifications.map(n=>`<button class="notification-item ${n.read?"read":"unread"}" data-notification-id="${escapeAttribute(n.id)}"><div class="notification-icon ${escapeAttribute(n.type||"info")}">${getNotificationIcon(n.type)}</div><div class="notification-content"><strong>${escapeHTML(n.title||"Notification")}</strong><span>${escapeHTML(n.message||"")}</span><small>${formatNotificationTime(n.createdAt||n.time)}</small></div></button>`).join(""):`<div class="notification-empty"><div class="empty-icon">${icon("bell")}</div><strong>No notifications</strong><span>You're all caught up.</span></div>`;
        dropdown.innerHTML=`<div class="notification-header"><div><strong>Notifications</strong><span>${notifications.filter(n=>!n.read).length} unread</span></div><button id="markAllNotificationsRead">Mark all read</button></div><div class="notification-list">${html}</div><a href="issues.html" class="notification-footer">View all activity ${icon("arrow")}</a>`;
        bindNotificationEvents();
    }

    function getNotificationIcon(type){
        if(type==="pickup")return icon("pickup");
        if(type==="collector"||type==="verification")return icon("collector");
        if(type==="payment")return icon("wallet");
        if(type==="success")return icon("leaf");
        if(type==="issue")return icon("alert");
        return icon("bell");
    }

    function formatNotificationTime(value){
        if(!value)return "Recently";
        const d=new Date(value);
        if(Number.isNaN(d.getTime()))return "Recently";
        const diff=Math.floor((Date.now()-d.getTime())/1000);
        if(diff<60)return "Just now";
        if(diff<3600)return `${Math.floor(diff/60)}m ago`;
        if(diff<86400)return `${Math.floor(diff/3600)}h ago`;
        if(diff<604800)return `${Math.floor(diff/86400)}d ago`;
        return d.toLocaleDateString("en-IN",{day:"2-digit",month:"short"});
    }

    function bindSidebarEvents(){
        document.getElementById("mobileMenuBtn")?.addEventListener("click",openMobileSidebar);
        document.getElementById("sidebarClose")?.addEventListener("click",closeMobileSidebar);
        document.getElementById("sidebarOverlay")?.addEventListener("click",closeMobileSidebar);
        document.getElementById("sidebarLogout")?.addEventListener("click",handleLogout);
        document.querySelectorAll(".nav-link").forEach(link=>link.addEventListener("click",closeMobileSidebar));
    }

    function openMobileSidebar(){
        document.getElementById("mainSidebar")?.classList.add("mobile-open");
        document.getElementById("sidebarOverlay")?.classList.add("active");
        document.body.classList.add("menu-open");
    }

    function closeMobileSidebar(){
        document.getElementById("mainSidebar")?.classList.remove("mobile-open");
        document.getElementById("sidebarOverlay")?.classList.remove("active");
        document.body.classList.remove("menu-open");
    }

    function bindTopbarEvents(){
        const nb=document.getElementById("notificationBtn"),nd=document.getElementById("notificationDropdown"),ub=document.getElementById("userMenuBtn"),ud=document.getElementById("userDropdown"),lo=document.getElementById("topbarLogout"),gs=document.getElementById("globalSearch");
        nb?.addEventListener("click",e=>{e.stopPropagation();closeUserDropdown();nd?.classList.toggle("show");});
        ub?.addEventListener("click",e=>{e.stopPropagation();closeNotificationDropdown();ud?.classList.toggle("show");});
        lo?.addEventListener("click",handleLogout);
        gs?.addEventListener("keydown",handleGlobalSearch);
    }

    function bindNotificationEvents(){
        document.getElementById("markAllNotificationsRead")?.addEventListener("click",()=>{
            if(typeof markAllNotificationsRead==="function")markAllNotificationsRead();
            renderTopbar();
            showToast("All notifications marked as read.","success","Notifications");
        });
        document.querySelectorAll(".notification-item").forEach(item=>item.addEventListener("click",()=>{
            const id=item.dataset.notificationId;
            if(id&&typeof markNotificationRead==="function")markNotificationRead(id);
            renderTopbar();
        }));
    }

    function closeNotificationDropdown(){document.getElementById("notificationDropdown")?.classList.remove("show");}
    function closeUserDropdown(){document.getElementById("userDropdown")?.classList.remove("show");}

    document.addEventListener("click",event=>{
        const nw=document.querySelector(".notification-wrapper"),uw=document.querySelector(".user-menu-wrapper");
        if(nw&&!nw.contains(event.target))closeNotificationDropdown();
        if(uw&&!uw.contains(event.target))closeUserDropdown();
    });

    function handleGlobalSearch(event){
        if(event.key!=="Enter")return;
        const query=event.target.value.trim().toLowerCase();
        if(!query)return;
        const routes=[
            [["dashboard","home","overview"],"dashboard.html"],
            [["citizen","citizens","user","users"],"citizens.html"],
            [["collector","collectors","driver"],"collectors.html"],
            [["pickup","pickups","booking"],"pickups.html"],
            [["scrap","material","rate","price"],"scrap.html"],
            [["payment","payments","money","transaction"],"payments.html"],
            [["reward","rewards","coin","coins"],"rewards.html"],
            [["analytics","stats","statistics","report"],"analytics.html"],
            [["issue","issues","support","complaint"],"issues.html"],
            [["setting","settings","configuration"],"settings.html"]
        ];
        const match=routes.find(r=>r[0].some(k=>query.includes(k)));
        if(match)window.location.href=match[1];
        else showToast(`No section found for "${event.target.value.trim()}".`,`info`,`Search`);
    }

    function handleLogout(event){
        event?.preventDefault();
        if(!window.confirm("Are you sure you want to sign out?"))return;
        if(typeof logoutAdmin==="function")logoutAdmin();
        else{try{clearAdminSession?.();}catch(e){console.error(e);}window.location.href="index.html";}
    }

    function ensureToastRoot(){
        let root=document.getElementById("toastRoot");
        if(!root){root=document.createElement("div");root.id="toastRoot";root.className="toast-container";document.body.appendChild(root);}
        return root;
    }

    function showToast(message,type="info",title=""){
        const root=ensureToastRoot();
        const toast=document.createElement("div");
        toast.className=`toast toast-${type}`;
        const iconName=type==="success"?"leaf":type==="error"||type==="warning"?"alert":"bell";
        toast.innerHTML=`<div class="toast-icon">${icon(iconName)}</div><div class="toast-content">${title?`<strong>${escapeHTML(title)}</strong>`:""}<span>${escapeHTML(message)}</span></div><button class="toast-close" aria-label="Close">${icon("close")}</button>`;
        root.appendChild(toast);
        requestAnimationFrame(()=>toast.classList.add("show"));
        toast.querySelector(".toast-close")?.addEventListener("click",()=>removeToast(toast));
        toast.dataset.timeout=setTimeout(()=>removeToast(toast),4500);
    }

    function removeToast(toast){
        if(!toast)return;
        clearTimeout(Number(toast.dataset.timeout)||0);
        toast.classList.remove("show");
        setTimeout(()=>toast.parentNode?.removeChild(toast),250);
    }

    function ensureModalRoot(){
        let root=document.getElementById("modalRoot");
        if(!root){root=document.createElement("div");root.id="modalRoot";document.body.appendChild(root);}
        return root;
    }

    /* Supports both the current options API and older page calls:
       openModal({title,content,...})
       openModal(content)
       openModal(title,content)
    */
    function openModal(options={},legacyContent=""){
        if(typeof options==="string"){
            options={
                title: legacyContent ? options : "Details",
                content: legacyContent || options
            };
        }
        const root=ensureModalRoot();
        const title=options.title||"Modal";
        const content=options.content||"";
        const size=options.size||"medium";
        const showClose=options.showClose!==false;
        root.innerHTML=`<div class="modal-backdrop" id="modalBackdrop"><div class="modal modal-${size}" role="dialog" aria-modal="true"><div class="modal-header"><div>${options.eyebrow?`<span class="modal-eyebrow">${escapeHTML(options.eyebrow)}</span>`:""}<h2>${escapeHTML(title)}</h2>${options.description?`<p>${escapeHTML(options.description)}</p>`:""}</div>${showClose?`<button class="modal-close" id="modalClose">${icon("close")}</button>`:""}</div><div class="modal-body">${content}</div>${options.footer?`<div class="modal-footer">${options.footer}</div>`:""}</div></div>`;
        const backdrop=document.getElementById("modalBackdrop");
        root.classList.add("active");
        document.body.classList.add("modal-open");
        requestAnimationFrame(()=>backdrop?.classList.add("show"));
        document.getElementById("modalClose")?.addEventListener("click",closeModal);
        if(options.closeOnBackdrop!==false)backdrop?.addEventListener("click",e=>{if(e.target===backdrop)closeModal();});
        document.addEventListener("keydown",handleModalEscape);
        if(typeof options.onOpen==="function")options.onOpen();
    }

    function closeModal(){
        const root=document.getElementById("modalRoot"),backdrop=document.getElementById("modalBackdrop");
        if(!root)return;
        backdrop?.classList.remove("show");
        setTimeout(()=>{root.innerHTML="";root.classList.remove("active");document.body.classList.remove("modal-open");},200);
        document.removeEventListener("keydown",handleModalEscape);
    }

    function handleModalEscape(event){if(event.key==="Escape")closeModal();}

    /* Supports both:
       confirmAction({message,onConfirm/...})
       confirmAction(message,callback)
    */
    function confirmAction(options={},legacyCallback=null){
        if(typeof options==="string"){
            options={message:options,onConfirm:legacyCallback};
        }
        return new Promise(resolve=>{
            const title=options.title||"Are you sure?";
            const message=options.message||"This action cannot be undone.";
            const confirmText=options.confirmText||"Confirm";
            const cancelText=options.cancelText||"Cancel";
            const danger=options.danger!==false;
            openModal({title,description:message,size:"small",content:`<div class="confirm-modal-content"><div class="confirm-icon ${danger?"danger":"warning"}">${icon(danger?"alert":"help")}</div><p>${escapeHTML(message)}</p></div>`,footer:`<button class="btn btn-secondary" id="cancelModalAction">${escapeHTML(cancelText)}</button><button class="btn ${danger?"btn-danger":"btn-primary"}" id="confirmModalAction">${escapeHTML(confirmText)}</button>`,onOpen:()=>{
                document.getElementById("confirmModalAction")?.addEventListener("click",()=>{
                    closeModal();
                    if(typeof options.onConfirm==="function")options.onConfirm();
                    resolve(true);
                });
                document.getElementById("cancelModalAction")?.addEventListener("click",()=>{closeModal();resolve(false);});
            }});
        });
    }

    function renderEmptyState(options={}){
        const title=options.title||"Nothing here yet",message=options.message||"There is no data to display.",iconName=options.icon||"recycle",action=options.action||"";
        return `<div class="empty-state"><div class="empty-state-icon">${icon(iconName)}</div><h3>${escapeHTML(title)}</h3><p>${escapeHTML(message)}</p>${action}</div>`;
    }

    function statusBadge(status,label=null){
        const normalized=String(status||"unknown").toLowerCase().replace(/\s+/g,"_");
        const displayLabel=label||String(status||"Unknown").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
        return `<span class="status-badge status-${normalized}"><span class="status-dot"></span>${escapeHTML(displayLabel)}</span>`;
    }

    function avatar(name,image=null,size=""){
        const initials=getInitials(name);
        if(image)return `<div class="avatar ${size}"><img src="${escapeAttribute(image)}" alt="${escapeAttribute(name)}" onerror="this.style.display='none';this.parentElement.classList.add('avatar-fallback');"><span>${initials}</span></div>`;
        return `<div class="avatar ${size}">${initials}</div>`;
    }

    function getInitials(name){
        if(!name)return "A";
        const words=String(name).trim().split(/\s+/).filter(Boolean);
        if(words.length===1)return words[0].substring(0,2).toUpperCase();
        return (words[0][0]+words[words.length-1][0]).toUpperCase();
    }

    function renderPagination(currentPage,totalPages,onPageChange){
        if(totalPages<=1)return "";
        let html=`<div class="pagination"><button class="pagination-btn" data-page="${currentPage-1}" ${currentPage<=1?"disabled":""}>←</button>`;
        const pages=[];
        if(totalPages<=7){for(let i=1;i<=totalPages;i++)pages.push(i);}
        else{pages.push(1);if(currentPage>4)pages.push("...");for(let i=Math.max(2,currentPage-1);i<=Math.min(totalPages-1,currentPage+1);i++)pages.push(i);if(currentPage<totalPages-3)pages.push("...");pages.push(totalPages);}
        pages.forEach(page=>{html+=page==="..."?`<span class="pagination-ellipsis">...</span>`:`<button class="pagination-btn ${page===currentPage?"active":""}" data-page="${page}">${page}</button>`;});
        return html+`<button class="pagination-btn" data-page="${currentPage+1}" ${currentPage>=totalPages?"disabled":""}>→</button></div>`;
    }

    function escapeHTML(value){
        if(value===null||value===undefined)return "";
        return String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
    }
    function escapeAttribute(value){return escapeHTML(value);}
    function debounce(fn,delay=300){let timeout;return function(...args){clearTimeout(timeout);timeout=setTimeout(()=>fn.apply(this,args),delay);};}
    function throttle(fn,limit=100){let waiting=false;return function(...args){if(waiting)return;fn.apply(this,args);waiting=true;setTimeout(()=>waiting=false,limit);};}

    document.addEventListener("keydown",event=>{
        if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){
            event.preventDefault();
            const search=document.getElementById("globalSearch");
            if(search){search.focus();search.select();}
        }
        if(event.key==="Escape"){closeNotificationDropdown();closeUserDropdown();closeMobileSidebar();}
    });

    function initializeComponents(){
        renderSidebar();
        renderTopbar();
        ensureToastRoot();
        ensureModalRoot();
        setTimeout(()=>document.body.classList.add("app-ready"),50);
    }

    window.EKABADI_COMPONENTS={icon,renderSidebar,renderTopbar,renderNotifications,showToast,removeToast,openModal,closeModal,confirmAction,renderEmptyState,statusBadge,avatar,renderPagination,getInitials,escapeHTML,escapeAttribute,debounce,throttle,openMobileSidebar,closeMobileSidebar};
    window.icon=icon;
    window.showToast=showToast;
    window.openModal=openModal;
    window.closeModal=closeModal;
    window.confirmAction=confirmAction;
    window.renderEmptyState=renderEmptyState;
    window.statusBadge=statusBadge;
    window.avatar=avatar;
    window.renderPagination=renderPagination;
    window.getInitials=getInitials;
    window.escapeHTML=escapeHTML;
    window.escapeAttribute=escapeAttribute;
    window.debounce=debounce;
    window.throttle=throttle;

    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initializeComponents);
    else initializeComponents();
})();