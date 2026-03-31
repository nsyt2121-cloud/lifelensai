let currentPlan = null;
let currentPrompt = "";

// DOM Elements
const landingView = document.getElementById('landing-view');
const loadingView = document.getElementById('loading-view');
const dashboardView = document.getElementById('dashboard-view');
const form = document.getElementById('plan-form');
const targetInput = document.getElementById('goal-input');
const themeController = document.getElementById('theme-controller');
const explainBtn = document.getElementById('explain-btn');
const regenerateBtn = document.getElementById('regenerate-btn');
const overlay = document.getElementById('explanation-overlay');
const closeExplainBtn = document.getElementById('close-explain-btn');
const explanationContent = document.getElementById('explanation-content');

// Helper for Prompts
window.fillPrompt = (text) => {
    targetInput.value = text;
    targetInput.focus();
};

window.resetApp = () => {
    switchView('landing-view');
    targetInput.value = '';
    setTheme('default');
    currentPlan = null;
    currentPrompt = "";
};

// Start generation flow
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = targetInput.value.trim();
    if (!prompt) return;

    currentPrompt = prompt;
    generatePlan(prompt);
});

const loadingPhrases = [
    "Waking up the AI from its nap...",
    "Brewing some digital coffee...",
    "Bribing the algorithm with cookies...",
    "Consulting the magic 8-ball...",
    "Herding the remaining brain cells...",
    "Pretending to type really fast...",
    "Doing complex math (or just guessing)...",
    "Almost done... supposedly..."
];

async function generatePlan(prompt) {
    switchView('loading-view');

    const logsConsole = document.getElementById('loading-logs');
    logsConsole.innerHTML = '';
    logsConsole.style.transform = 'translateY(0)';
    let currentPhase = 0;
    
    loadingPhrases.forEach((phrase, i) => {
        const li = document.createElement('li');
        li.className = 'log-item';
        li.innerText = phrase;
        logsConsole.appendChild(li);
        if (i === 0) li.classList.add('active');
    });

    const loadInterval = setInterval(() => {
        currentPhase++;
        const items = logsConsole.querySelectorAll('.log-item');
        items.forEach(el => el.classList.remove('active'));
        
        if (items[currentPhase]) {
            items[currentPhase].classList.add('active');
            logsConsole.style.transform = `translateY(-${currentPhase * 35}px)`;
        } else {
            items[items.length - 1].classList.add('active');
        }
    }, 1200);

    try {
        const modeRadios = document.getElementsByName('plan-mode');
        let selectedMode = 'balanced';
        for(let radio of modeRadios) {
            if(radio.checked) selectedMode = radio.value;
        }

        const response = await fetch('http://127.0.0.1:5000/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal: prompt, mode: selectedMode })
        });

        if (!response.ok) {
            let errorMsg = "Failed to generate plan";
            try {
                const errData = await response.json();
                errorMsg = errData.details || errData.error || errorMsg;
            } catch (e) { }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        currentPlan = data;

        clearInterval(loadInterval);
        populateDashboard(data);
        switchView('dashboard-view');

    } catch (error) {
        clearInterval(loadInterval);
        console.error("Error generating plan:", error);
        if (error.message === "Failed to fetch") {
            alert('Cannot connect to AI server. Please make sure you are running "python app.py" in your terminal!');
        } else {
            alert('An error occurred: ' + error.message);
        }
        switchView('landing-view');
    }
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
        // Reset animations on hide
        if (v.id === 'dashboard-view') {
            v.querySelectorAll('.animate-enter').forEach(el => {
                el.style.animation = 'none';
            });
        }
    });

    const newView = document.getElementById(viewId);
    newView.classList.add('active');

    // Trigger animations on show
    if (viewId === 'dashboard-view') {
        setTimeout(() => {
            newView.querySelectorAll('.animate-enter').forEach(el => {
                el.style.animation = '';
            });
        }, 50);
    }
}

function setTheme(intent) {
    const validThemes = ['urgent', 'productivity', 'calm'];
    const theme = validThemes.includes(intent) ? intent : 'default';
    themeController.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme', theme); // Set on HTML/root to trigger CSS vars
}

function populateDashboard(plan) {
    // Determine and set theme
    const intent = plan.intent_type ? plan.intent_type.toLowerCase() : 'default';
    setTheme(intent);

    // Goal & Next Action & Complexity
    document.getElementById('display-goal').textContent = plan.goal || '';
    const complexityEl = document.getElementById('display-complexity');
    if (complexityEl) complexityEl.textContent = plan.complexity || 'Intermediate';
    document.getElementById('display-next-action').textContent = plan.next_action || '';

    // Tasks Array
    const tasksList = document.getElementById('display-tasks');
    tasksList.innerHTML = '';
    plan.tasks.forEach((taskObj, i) => {
        let taskDesc = typeof taskObj === 'string' ? taskObj : taskObj.desc;
        let priority = typeof taskObj === 'string' ? 'medium' : taskObj.priority;
        const cleanTask = taskDesc.replace(/\*\*/g, '').replace(/__/g, '');
        
        const li = document.createElement('li');
        li.className = `task-item priority-${priority}`;
        li.draggable = true;
        li.innerHTML = `
            <div class="drag-handle"><i class="fa-solid fa-grip-vertical"></i></div>
            <div class="task-checkbox"></div>
            <div class="task-text" contenteditable="true">${cleanTask}</div>
            <div class="task-badge">${priority}</div>
        `;
        li.querySelector('.task-checkbox').addEventListener('click', function (e) {
            e.stopPropagation();
            li.classList.toggle('completed');
            updateProgress();
        });
        
        const taskTextEl = li.querySelector('.task-text');
        taskTextEl.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.blur();
            }
        });
        taskTextEl.addEventListener('blur', function() {
            updateProgress(); // Recalculate dynamic next action
        });
        
        tasksList.appendChild(li);
        
        li.addEventListener('dragstart', () => li.classList.add('dragging'));
        li.addEventListener('dragend', () => li.classList.remove('dragging'));
    });

    tasksList.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(tasksList, e.clientY);
        const dragging = document.querySelector('.dragging');
        if (afterElement == null) tasksList.appendChild(dragging);
        else tasksList.insertBefore(dragging, afterElement);
    });

    setTimeout(updateProgress, 100);

    // Timeline Array
    const timelineBox = document.getElementById('display-timeline');
    timelineBox.innerHTML = '';
    plan.timeline.forEach((step, i) => {
        const cleanStep = step.replace(/\*\*/g, '').replace(/__/g, '');
        const div = document.createElement('div');
        div.className = 'timeline-item timeline-animate';
        div.style.setProperty('--item-delay', `${i * 0.15}s`);
        
        if (cleanStep.includes(' - ')) {
            const parts = cleanStep.split(' - ');
            div.innerHTML = `
                <div class="timeline-content">
                    <span class="timeline-title">${parts[0]}</span>
                    <span class="timeline-desc">${parts.slice(1).join(' - ')}</span>
                </div>
            `;
        } else {
            div.innerHTML = `
                <div class="timeline-content">
                    <span class="timeline-title">${cleanStep}</span>
                </div>
            `;
        }
        timelineBox.appendChild(div);
    });

    // Risks Array
    const risksList = document.getElementById('display-risks');
    risksList.innerHTML = '';
    plan.risks.forEach(riskObj => {
        let desc = typeof riskObj === 'string' ? riskObj : riskObj.desc;
        let severity = typeof riskObj === 'string' ? 'medium' : riskObj.severity;
        let mitigation = typeof riskObj === 'string' ? 'No specific mitigation provided.' : riskObj.mitigation;
        
        const cleanRisk = desc.replace(/\*\*/g, '').replace(/__/g, '');
        const li = document.createElement('li');
        li.className = 'risk-item';
        li.innerHTML = `
            <div class="risk-header">
                <span class="risk-title">${cleanRisk}</span>
                <span class="risk-badge severity-${severity}">${severity}</span>
            </div>
            <div class="risk-mitigation"><i class="fa-solid fa-shield"></i> <span>${mitigation}</span></div>
        `;
        risksList.appendChild(li);
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Regenerate Action
regenerateBtn.addEventListener('click', () => {
    if (currentPrompt) {
        generatePlan(currentPrompt);
    }
});

// Explain Action
explainBtn.addEventListener('click', async () => {
    overlay.classList.remove('hidden');
    // Ensure small DOM reflow
    setTimeout(() => overlay.classList.add('active'), 10);

    explanationContent.innerHTML = '<div class="mini-spinner"></div><p style="text-align:center; margin-top:1rem; color:var(--text-secondary)">AI is explaining...</p>';

    try {
        const response = await fetch('http://127.0.0.1:5000/explain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: currentPlan })
        });

        const data = await response.json();
        explanationContent.innerHTML = `<p>${data.explanation}</p>`;
    } catch (e) {
        explanationContent.innerHTML = `<p style="color:var(--error)">Failed to fetch explanation.</p>`;
    }
});

// Close Overlay
closeExplainBtn.addEventListener('click', () => {
    overlay.classList.remove('active');
    setTimeout(() => overlay.classList.add('hidden'), 300);
});

// Custom Cursor Logic
const cursorDot = document.getElementById('cursor-dot');
const cursorOutline = document.getElementById('cursor-outline');

if (cursorDot && cursorOutline) {
    window.addEventListener('mousemove', (e) => {
        const posX = e.clientX;
        const posY = e.clientY;
        
        cursorDot.style.left = `${posX}px`;
        cursorDot.style.top = `${posY}px`;
        
        cursorOutline.animate({
            left: `${posX}px`,
            top: `${posY}px`
        }, { duration: 150, fill: "forwards" });
    });

    window.addEventListener('mousedown', () => {
        cursorDot.style.transform = 'translate(-50%, -50%) scale(0.5)';
        cursorOutline.style.transform = 'translate(-50%, -50%) scale(0.8)';
    });
    
    window.addEventListener('mouseup', () => {
        cursorDot.style.transform = 'translate(-50%, -50%) scale(1)';
        cursorOutline.style.transform = 'translate(-50%, -50%) scale(1)';
    });

    document.addEventListener('mouseover', (e) => {
        const target = e.target;
        if (!target) return;
        
        if (target.tagName?.toLowerCase() === 'button' || 
            target.tagName?.toLowerCase() === 'a' || 
            target.tagName?.toLowerCase() === 'input' || 
            target.closest('.glass-button') || 
            target.closest('.neon-button') || 
            target.closest('.task-checkbox') || 
            target.closest('.suggestion-chip') || 
            target.closest('.chat-fab') || 
            target.closest('.logo') || 
            target.closest('.drag-handle') ||
            target.hasAttribute('contenteditable')) {
                document.body.classList.add('hovering');
        } else {
            document.body.classList.remove('hovering');
        }
    });

    // Remove custom cursor styling on touch devices (mobile fixes)
    window.addEventListener('touchstart', () => {
        cursorDot.style.display = 'none';
        cursorOutline.style.display = 'none';
        document.body.style.cursor = 'auto';
    });
}

// Progress Calculation
let hasFiredConfetti = false;

function updateProgress() {
    const total = document.querySelectorAll('.task-item').length;
    const completed = document.querySelectorAll('.task-item.completed').length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    // Confetti logic
    if (percentage === 100 && total > 0) {
        if (!hasFiredConfetti) {
            hasFiredConfetti = true;
            fireConfetti();
        }
    } else {
        hasFiredConfetti = false;
    }
    
    const circle = document.querySelector('.progress-ring__circle.fg');
    const text = document.getElementById('progress-text');
    
    if (circle) {
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        const offset = circumference - (percentage / 100) * circumference;
        circle.style.strokeDashoffset = offset;
    }
    
    if (text) text.innerText = `${percentage}%`;

    const incompleteTasks = document.querySelectorAll('.task-item:not(.completed) .task-text');
    const displayNextAction = document.getElementById('display-next-action');
    if (incompleteTasks.length > 0) {
        if (completed === 0 && currentPlan && currentPlan.next_action) {
            displayNextAction.innerText = currentPlan.next_action;
        } else {
            displayNextAction.innerText = incompleteTasks[0].innerText;
        }
    } else {
        displayNextAction.innerText = "All tasks complete! Outstanding work!";
    }
}

// Confetti Applause Animation
function fireConfetti() {
    if (typeof confetti === 'undefined') return;
    const duration = 2.5 * 1000;
    const end = Date.now() + duration;
    const colors = ['#6366f1', '#10b981', '#a855f7', '#ffffff', '#f59e0b'];

    (function frame() {
        confetti({
            particleCount: 6,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.8 },
            colors: colors
        });
        confetti({
            particleCount: 6,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.8 },
            colors: colors
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());
}

// Chatbot Logic
const chatWidget = document.getElementById('chatbot-widget');
const chatFab = document.getElementById('chat-fab');
const closeChatBtn = document.getElementById('close-chat-btn');
const chatBody = document.getElementById('chat-body');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');

chatFab.addEventListener('click', () => {
    chatWidget.classList.remove('hidden-chat');
    chatFab.classList.add('hidden-fab');
});

closeChatBtn.addEventListener('click', () => {
    chatWidget.classList.add('hidden-chat');
    chatFab.classList.remove('hidden-fab');
});

let msgCounter = 0;
function appendMessage(text, className, isThinking = false) {
    const div = document.createElement('div');
    div.className = `chat-message ${className}`;
    div.id = `msg-${msgCounter++}`;
    
    if (isThinking) {
        div.innerHTML = `
            <div class="msg-bubble">
                <div class="typing-indicator">
                    <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
                </div>
            </div>`;
    } else {
        div.innerHTML = `<div class="msg-bubble">${text}</div>`;
    }
    
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
    return div.id;
}

async function sendChatMessage() {
    const msg = chatInput.value.trim();
    if(!msg) return;
    
    chatInput.value = '';
    appendMessage(msg, 'user-message');
    
    const thinkingId = appendMessage('', 'ai-message', true);
    
    try {
        const response = await fetch('http://127.0.0.1:5000/chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({message: msg})
        });
        const data = await response.json();
        
        const thinkingEl = document.getElementById(thinkingId);
        thinkingEl.innerHTML = `<div class="msg-bubble">${data.reply || data.error}</div>`;
    } catch(e) {
        document.getElementById(thinkingId).innerHTML = `<div class="msg-bubble">Sorry, I couldn't reach the server right now.</div>`;
    }
}

sendChatBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') sendChatMessage();
});
