
/* ================= SYSTEM AUTHENTICATION ================= */
const auth = {
    users: JSON.parse(localStorage.getItem('tandur_users')) || [],
    currentUser: JSON.parse(localStorage.getItem('tandur_session')) || null,

    register: (name, email, password) => {
        if (auth.users.find(u => u.email === email)) {
            alert("Email sudah terdaftar!");
            return false;
        }
        // Simple hash (bukan untuk produksi high-security)
        const hashedPassword = btoa(password); 
        const newUser = { 
            name, email, password: hashedPassword,
            // Game Data Initial State
            gameData: {
                level: 1, xp: 0, dew: 0,
                water: 80, sun: 80,
                plantStage: 0, // 0: Seed, 1: Sprout, etc.
                lastLogin: Date.now()
            }
        };
        auth.users.push(newUser);
        auth.saveUsers();
        alert("Registrasi berhasil! Silakan login.");
        return true;
    },

    login: (email, password) => {
        const hashedPassword = btoa(password);
        const user = auth.users.find(u => u.email === email && u.password === hashedPassword);
        if (user) {
            auth.currentUser = user;
            localStorage.setItem('tandur_session', JSON.stringify(user));
            app.init();
            return true;
        } else {
            alert("Email atau password salah!");
            return false;
        }
    },

    logout: () => {
        localStorage.removeItem('tandur_session');
        location.reload();
    },

    saveUsers: () => {
        localStorage.setItem('tandur_users', JSON.stringify(auth.users));
    },

    updateUserData: () => {
        // Update current user data back to main array
        const index = auth.users.findIndex(u => u.email === auth.currentUser.email);
        if (index !== -1) {
            auth.users[index] = auth.currentUser;
            auth.saveUsers();
            localStorage.setItem('tandur_session', JSON.stringify(auth.currentUser));
        }
    }
};

/* ================= GAME LOGIC ================= */
const game = {
    plants: ['🌱', '🌿', '🌷', '🌻', '🌳', '🌲', '🌸', '🎋', '🌴', '🧛‍♀️'], // Level 10 is Venus Flytrap
    
    init: () => {
        game.renderUI();
        game.startLoop();
        game.calculateOfflineProgress();
        
        // Background Music (Auto play policy requires interaction usually)
        document.body.addEventListener('click', () => {
            document.getElementById('bgm').volume = 0.3;
            document.getElementById('bgm').play().catch(e=>{});
        }, {once:true});
    },

    calculateOfflineProgress: () => {
        const now = Date.now();
        const diffHours = (now - auth.currentUser.gameData.lastLogin) / (1000 * 60 * 60);
        
        // Kurangi air dan cahaya berdasarkan waktu offline
        if(diffHours > 1) {
            let drain = Math.floor(diffHours * 5);
            auth.currentUser.gameData.water = Math.max(0, auth.currentUser.gameData.water - drain);
            auth.currentUser.gameData.sun = Math.max(0, auth.currentUser.gameData.sun - drain);
            alert(`Selamat datang kembali! Selama kamu pergi, tanamanmu kehilangan ${drain}% air.`);
        }
        auth.currentUser.gameData.lastLogin = now;
        auth.updateUserData();
    },

    startLoop: () => {
        setInterval(() => {
            // Natural depletion
            if(auth.currentUser.gameData.water > 0) auth.currentUser.gameData.water -= 0.5;
            if(auth.currentUser.gameData.sun > 0) auth.currentUser.gameData.sun -= 0.3; // Slower drain
            
            // Random Insect Spawn (10% chance every 3 sec)
            if(Math.random() < 0.1) game.spawnInsect();

            // Day/Night Check (Simple simulation based on device time or mock)
            const hour = new Date().getHours();
            if(hour >= 18 || hour < 6) document.body.classList.add('night-mode');
            else document.body.classList.remove('night-mode');

            game.renderUI();
            auth.updateUserData();
        }, 3000); // Update every 3 seconds
    },

    waterPlant: () => {
        if(auth.currentUser.gameData.water >= 100) return;
        
        // Haptic
        if(navigator.vibrate) navigator.vibrate(50);
        
        // Sound
        const sfx = document.getElementById('sfx-water');
        sfx.currentTime = 0; 
        sfx.play();

        auth.currentUser.gameData.water = Math.min(100, auth.currentUser.gameData.water + 20);
        game.addXP(10);
        game.renderUI();
    },

    prunePlant: () => {
        // Animation only for demo, adds XP
        if(navigator.vibrate) navigator.vibrate(30);
        game.addXP(5);
        alert("Kamu membersihkan daun kering. Tanamanmu senang!");
    },

    spawnInsect: () => {
        const insects = ['🐞', '🐝', '🦋', '🦗'];
        const randomInsect = insects[Math.floor(Math.random() * insects.length)];
        const el = document.createElement('div');
        el.className = 'insect';
        el.innerText = randomInsect;
        
        // Random Position
        el.style.left = Math.random() * 80 + 10 + '%';
        el.style.top = Math.random() * 80 + 10 + '%';
        
        // Click Event
        el.onclick = function() {
            this.remove();
            const reward = Math.floor(Math.random() * 5) + 1;
            game.addDew(reward);
            game.addXP(15);
            if(navigator.vibrate) navigator.vibrate([50, 50, 50]);
        };

        document.getElementById('insect-layer').appendChild(el);

        // Auto remove after 10 seconds
        setTimeout(() => el.remove(), 10000);
    },

    addXP: (amount) => {
        let data = auth.currentUser.gameData;
        data.xp += amount;
        
        // Level Up Logic (XP needed = Level * 100)
        let needed = data.level * 100;
        if (data.xp >= needed) {
            data.level++;
            data.xp = 0; // Reset XP or carry over (Reset for simplicity)
            data.plantStage = Math.min(data.level - 1, game.plants.length - 1);
            alert(`Level Up! Tanamanmu berevolusi ke Level ${data.level}!`);
            
            // Visual Grow Animation
            const plant = document.getElementById('plant-visual');
            plant.classList.add('plant-grow');
            setTimeout(()=>plant.classList.remove('plant-grow'), 600);
        }
        auth.updateUserData();
        game.renderUI();
    },

    addDew: (amount) => {
        auth.currentUser.gameData.dew += amount;
        game.renderUI();
    },

    buyItem: (item, cost) => {
        if(auth.currentUser.gameData.dew >= cost) {
            auth.currentUser.gameData.dew -= cost;
            game.addXP(50); // Buying items gives XP
            alert("Item berhasil dibeli! (+50 XP)");
            game.renderUI();
            auth.updateUserData();
        } else {
            alert("Embun Cahaya tidak cukup!");
        }
    },

    renderUI: () => {
        const data = auth.currentUser.gameData;
        
        // Stats
        document.getElementById('user-level').innerText = `Lvl ${data.level}`;
        document.getElementById('xp-bar').style.width = `${(data.xp / (data.level * 100)) * 100}%`;
        document.getElementById('currency-display').innerText = data.dew;
        document.getElementById('shop-currency').innerText = data.dew;
        
        // Bars
        document.getElementById('water-bar').style.width = `${data.water}%`;
        document.getElementById('sun-bar').style.width = `${data.sun}%`;
        
        // Plant Visual
        document.getElementById('plant-visual').innerText = game.plants[data.plantStage];
        
        // Plant Condition (Wither if water is 0)
        if(data.water <= 0) {
            document.getElementById('plant-visual').style.filter = 'sepia(1) grayscale(0.5)';
            document.getElementById('plant-visual').style.transform = 'rotate(10deg)';
        } else {
            document.getElementById('plant-visual').style.filter = 'drop-shadow(0 5px 5px rgba(0,0,0,0.2))';
            document.getElementById('plant-visual').style.transform = 'rotate(0deg)';
        }
    }
};

/* ================= APP CONTROLLER ================= */
const app = {
    init: () => {
        // Toggle Screens
        if (auth.currentUser) {
            document.getElementById('auth-section').classList.add('d-none');
            document.getElementById('game-section').classList.remove('d-none');
            
            // Update Profile Modal
            document.getElementById('profile-name').innerText = auth.currentUser.name;
            document.getElementById('profile-email').innerText = auth.currentUser.email;

            game.init();
        } else {
            document.getElementById('auth-section').classList.remove('d-none');
            document.getElementById('game-section').classList.add('d-none');
        }
    }
};

// Event Listeners for Forms
document.getElementById('show-register').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').classList.add('d-none');
    document.getElementById('register-form').classList.remove('d-none');
});

document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-form').classList.add('d-none');
    document.getElementById('login-form').classList.remove('d-none');
});

document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    if(auth.register(name, email, pass)) {
        document.getElementById('show-login').click();
    }
});

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    auth.login(email, pass);
});

// Zen Mode Toggle
document.getElementById('zen-mode-btn').addEventListener('click', () => {
    document.body.classList.toggle('zen-active');
    // Click anywhere to exit zen mode
    if(document.body.classList.contains('zen-active')) {
        setTimeout(() => {
            document.addEventListener('click', removeZen, {once:true});
        }, 100);
    }
});

function removeZen() {
    document.body.classList.remove('zen-active');
}

// Start App
document.addEventListener('DOMContentLoaded', app.init);
