
// H4 - Dashboard Router by Level (Beta 1)

function renderDashboardByLevel(level){
    switch(level){
        case "pres":
            renderPresDashboard();
            break;
        case "sen":
            renderSenDashboard();
            break;
        case "dip":
            renderDipDashboard();
            break;
        case "alc":
            renderAlcDashboard();
            break;
        default:
            renderPresDashboard();
    }
}

// Temporary routing to existing dashboard
function renderPresDashboard(){
    if(typeof renderDashboard === "function"){
        renderDashboard();
    }
}
function renderSenDashboard(){
    if(typeof renderDashboard === "function"){
        renderDashboard();
    }
}
function renderDipDashboard(){
    if(typeof renderDashboard === "function"){
        renderDashboard();
    }
}
function renderAlcDashboard(){
    if(typeof renderDashboard === "function"){
        renderDashboard();
    }
}
