/* ==========================================================================
   ROMANTIC AUDIO SYNTHESISER (Web Audio API)
   ========================================================================== */
class RomanticSynth {
    constructor() {
        this.ctx = null;
        this.isPlaying = false;
        this.timeoutIds = [];
        this.activeNodes = [];
    }

    init() {
        if (this.ctx) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();
        
        // Setup master volume and simple delay line for spacey reverb-like sound
        this.masterVolume = this.ctx.createGain();
        this.masterVolume.gain.setValueAtTime(0.08, this.ctx.currentTime); // Low background volume
        
        this.delay = this.ctx.createDelay(1.0);
        this.delayFeedback = this.ctx.createGain();
        
        this.delay.delayTime.setValueAtTime(0.4, this.ctx.currentTime);
        this.delayFeedback.gain.setValueAtTime(0.4, this.ctx.currentTime);
        
        // Connections: Synth -> masterVolume -> Destination
        // Connections: masterVolume -> delay -> delayFeedback -> delay (loop) -> Destination
        this.masterVolume.connect(this.ctx.destination);
        this.masterVolume.connect(this.delay);
        this.delay.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delay);
        this.delay.connect(this.ctx.destination);
    }

    // Play a single note with smooth piano-like envelope
    playNote(frequency, startTime, duration) {
        if (!this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        // Custom simple wave: a combination of sine and triangle for warm, soft tone
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(frequency, startTime);
        
        // Envelope: smooth attack, long decay/release
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.8, startTime + 0.1); // Attack
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Decay/Release
        
        // Low-pass filter to make it softer and warmer
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(700, startTime);
        filter.frequency.exponentialRampToValueAtTime(250, startTime + duration);
        
        // Wire up
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterVolume);
        
        osc.start(startTime);
        osc.stop(startTime + duration + 0.1);
        
        // Keep track of nodes to clean up if stopped
        this.activeNodes.push(osc);
    }

    // Start the looping romantic melody
    start() {
        this.init();
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this.isPlaying = true;
        this.playMelodyLoop();
    }

    // Stop the synthesizer
    stop() {
        this.isPlaying = false;
        this.timeoutIds.forEach(id => clearTimeout(id));
        this.timeoutIds = [];
        this.activeNodes.forEach(node => {
            try { node.stop(); } catch(e) {}
        });
        this.activeNodes = [];
    }

    // Loops a chord progression and romantic top melody (Fmaj7 - G - Em7 - Am)
    playMelodyLoop() {
        if (!this.isPlaying) return;
        
        const now = this.ctx.currentTime;
        let t = 0; // Relative time in seconds
        
        // Chords frequencies: [Root, 3rd, 5th, 7th/Octave]
        const chordFmaj7 = [174.61, 220.00, 261.63, 329.63]; // F3, A3, C4, E4
        const chordG6 = [196.00, 246.94, 293.66, 392.00];    // G3, B3, D4, G4
        const chordEm7 = [164.81, 196.00, 246.94, 329.63];   // E3, G3, B3, E4
        const chordAm7 = [220.00, 261.63, 329.63, 392.00];   // A3, C4, E4, G4

        // 1. Play Chord 1 (Fmaj7) - Duration 4s
        this.playChord(chordFmaj7, now + t, 3.8);
        this.playNote(440.00, now + t + 0.0, 1.5); // A4
        this.playNote(523.25, now + t + 1.0, 1.5); // C5
        this.playNote(587.33, now + t + 2.0, 2.0); // D5
        t += 4.0;
        
        // 2. Play Chord 2 (G6) - Duration 4s
        this.playChord(chordG6, now + t, 3.8);
        this.playNote(493.88, now + t + 0.0, 1.5); // B4
        this.playNote(392.00, now + t + 1.5, 1.5); // G4
        this.playNote(587.33, now + t + 2.5, 1.5); // D5
        t += 4.0;
        
        // 3. Play Chord 3 (Em7) - Duration 4s
        this.playChord(chordEm7, now + t, 3.8);
        this.playNote(329.63, now + t + 0.0, 1.5); // E4
        this.playNote(523.25, now + t + 1.0, 1.5); // C5
        this.playNote(493.88, now + t + 2.0, 2.0); // B4
        t += 4.0;
        
        // 4. Play Chord 4 (Am7) - Duration 4s
        this.playChord(chordAm7, now + t, 3.8);
        this.playNote(440.00, now + t + 0.0, 1.5); // A4
        this.playNote(392.00, now + t + 1.0, 1.0); // G4
        this.playNote(440.00, now + t + 2.0, 2.0); // A4
        t += 4.0;

        // Schedule next iteration loop
        const loopDurationMs = t * 1000;
        const timeoutId = setTimeout(() => this.playMelodyLoop(), loopDurationMs);
        this.timeoutIds.push(timeoutId);
    }

    playChord(freqs, startTime, duration) {
        // Soft roll effect (arpeggiated entrance of chord notes)
        freqs.forEach((freq, idx) => {
            this.playNote(freq, startTime + (idx * 0.05), duration - (idx * 0.05));
        });
    }
}

// Instantiate Synth
const romanticSynth = new RomanticSynth();

/* ==========================================================================
   PARTICLE CANVAS (Floating Hearts)
   ========================================================================== */
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

let particles = [];
let maxParticles = 60;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class HeartParticle {
    constructor(isExplosion = false, x = 0, y = 0) {
        this.isExplosion = isExplosion;
        this.reset(x, y);
    }

    reset(x = 0, y = 0) {
        if (this.isExplosion) {
            this.x = x;
            this.y = y;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.size = Math.random() * 8 + 6;
            this.alpha = 1.0;
            this.decay = Math.random() * 0.02 + 0.01;
        } else {
            this.x = Math.random() * canvas.width;
            this.y = canvas.height + Math.random() * 100;
            this.vx = (Math.random() - 0.5) * 0.6;
            this.vy = -(Math.random() * 1.0 + 0.5);
            this.size = Math.random() * 15 + 5;
            this.alpha = Math.random() * 0.4 + 0.2;
            this.decay = 0.0005; // very slow fade
        }
        this.rotation = Math.random() * Math.PI;
        this.rotationSpeed = (Math.random() - 0.5) * 0.01;
        this.color = this.getRandomColor();
    }

    getRandomColor() {
        const colors = [
            'rgba(255, 107, 139, ', // pink
            'rgba(255, 51, 102, ',  // red
            'rgba(255, 207, 115, ', // gold
            'rgba(255, 150, 180, '  // soft pink
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        
        if (this.isExplosion) {
            this.alpha -= this.decay;
            this.vy += 0.05; // gravity for explosion particles
        } else {
            // Natural rise fade out near top
            if (this.y < 100) {
                this.alpha -= 0.005;
            }
        }

        // Reset condition
        if (this.alpha <= 0 || this.x < -20 || this.x > canvas.width + 20 || this.y < -20) {
            if (this.isExplosion) {
                return false; // remove from list
            } else {
                this.reset();
            }
        }
        return true;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color + '1)';
        
        // Draw Heart
        ctx.beginPath();
        ctx.moveTo(0, 0);
        // Left side curve
        ctx.bezierCurveTo(-this.size/2, -this.size/2, -this.size, this.size/3, 0, this.size);
        // Right side curve
        ctx.bezierCurveTo(this.size, this.size/3, this.size/2, -this.size/2, 0, 0);
        ctx.fill();
        ctx.restore();
    }
}

// Initialize floating particles
function initParticles() {
    for (let i = 0; i < maxParticles; i++) {
        // Distribute them vertically so they don't all rise together at startup
        const p = new HeartParticle();
        p.y = Math.random() * canvas.height;
        particles.push(p);
    }
}

// Particle loop
function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Filter and update particles
    particles = particles.filter(p => {
        const active = p.update();
        if (active) p.draw();
        return active;
    });

    requestAnimationFrame(animateParticles);
}

// Burst particles on clicking/calculating
function triggerHeartExplosion(x, y) {
    for (let i = 0; i < 40; i++) {
        particles.push(new HeartParticle(true, x, y));
    }
}

initParticles();
animateParticles();

/* ==========================================================================
   TYPEWRITER EFFECT (Personalized Love Letter)
   ========================================================================== */
const letterText = `Hari ini, aku ingin meluangkan waktu sejenak untuk menuliskan sesuatu yang barangkali jarang kuungkapkan secara langsung.

Aku ingin mengucapkan terima kasih yang sebesar-sebesarnya kepadamu. Terima kasih karena sudah memilih untuk bersamaku, dan yang paling berarti bagi hidupku: terima kasih karena sudah mau menerimaku apa adanya.

Aku tahu aku bukanlah orang yang sempurna. Aku memiliki banyak kekurangan, ketakutan, dan saat-saat di mana aku merasa tidak cukup baik. Namun, setiap kali aku melihat ke arahmu, aku melihat ketulusan yang luar biasa. Kamu menerima setiap bagian dari diriku, merangkul ketidaksempurnaanku, dan selalu menjadikanku merasa utuh.

Di dunia yang selalu menuntut kita untuk menjadi sempurna, berada di dekatmu adalah satu-satunya tempat di mana aku bisa melepas semua topeng dan menjadi diriku sendiri secara jujur tanpa rasa takut dihakimi.

Kehadiranmu di hidupku adalah hadiah terindah. Aku berjanji untuk terus belajar membahagiakanmu, menghargaimu, dan menemanimu di setiap langkah perjalanan kita ke depan.

Terima kasih, Riskya. Kamu adalah rumah ternyaman tempatku pulang.`;

let letterIndex = 0;
const typewriterContainer = document.getElementById('typewriterText');

function typeLetter() {
    if (letterIndex < letterText.length) {
        const char = letterText.charAt(letterIndex);
        if (char === '\n') {
            typewriterContainer.innerHTML += '<br>';
        } else {
            typewriterContainer.innerHTML += char;
        }
        letterIndex++;
        // Speed controls: periods have slightly longer delays for natural flow
        let delay = 35;
        if (char === '.' || char === '?' || char === '!') {
            delay = 400;
        } else if (char === ',') {
            delay = 150;
        }
        setTimeout(typeLetter, delay);
    } else {
        // Text complete, render blinking cursor final state or hide it
        typewriterContainer.innerHTML += '<span class="cursor">|</span>';
    }
}

/* ==========================================================================
   USER INTERACTION HANDLERS
   ========================================================================== */

// 1. Enter Button Screen transition
const btnEnter = document.getElementById('btnEnter');
const entryScreen = document.getElementById('entryScreen');
const mainContent = document.getElementById('mainContent');
const musicToggle = document.getElementById('musicToggle');

btnEnter.addEventListener('click', () => {
    // Fade out entry screen
    entryScreen.style.opacity = '0';
    
    // Play music (Web Audio API)
    romanticSynth.start();
    musicToggle.classList.add('playing');
    musicToggle.querySelector('.music-tooltip').innerText = 'Jeda Musik';
    
    setTimeout(() => {
        entryScreen.classList.add('hidden');
        mainContent.classList.remove('hidden');
        mainContent.style.animation = 'fadeIn 1s ease-out forwards';
        
        // Start typing letter
        setTimeout(typeLetter, 800);
    }, 800);
});

// 2. Music Toggle Button
musicToggle.addEventListener('click', () => {
    if (romanticSynth.isPlaying) {
        romanticSynth.stop();
        musicToggle.classList.remove('playing');
        musicToggle.querySelector('.music-tooltip').innerText = 'Putar Musik';
    } else {
        romanticSynth.start();
        musicToggle.classList.add('playing');
        musicToggle.querySelector('.music-tooltip').innerText = 'Jeda Musik';
    }
    // Mini explosion on music click
    const rect = musicToggle.getBoundingClientRect();
    triggerHeartExplosion(rect.left + rect.width/2, rect.top + rect.height/2);
});

// 3. Card Touch Support (Mobile Flip)
const reasonCards = document.querySelectorAll('.reason-card');
reasonCards.forEach(card => {
    card.addEventListener('click', function(e) {
        this.classList.toggle('flipped');
        
        // Heart burst on card flip
        const rect = this.getBoundingClientRect();
        triggerHeartExplosion(rect.left + rect.width/2, rect.top + rect.height/2);
    });
});

// 4. Love Calculator Algorithm
const btnCalculate = document.getElementById('btnCalculate');
const calcResult = document.getElementById('calcResult');
const percentNumber = document.getElementById('percentNumber');
const resultBar = document.getElementById('resultBar');
const resultTitle = document.getElementById('resultTitle');
const resultText = document.getElementById('resultText');

btnCalculate.addEventListener('click', (e) => {
    // Prevent spam clicking
    if (btnCalculate.disabled) return;
    btnCalculate.disabled = true;
    
    // Hide previous results
    calcResult.classList.remove('hidden');
    percentNumber.innerText = "0";
    resultBar.style.width = "0%";
    resultTitle.innerText = "Menyelaraskan Detak Jantung...";
    resultText.innerText = "Sedang menghitung koneksi batin antara kita...";
    
    // Heart explosion coordinates
    const rect = btnCalculate.getBoundingClientRect();
    triggerHeartExplosion(rect.left + rect.width/2, rect.top + rect.height/2);

    const phases = [
        { text: "Membaca Ketulusan Riskya...", delay: 800 },
        { text: "Mengukur Penerimaan Apa Adanya...", delay: 1600 },
        { text: "Menghubungkan Dua Belahan Jiwa...", delay: 2400 },
        { text: "Hasil Ditemukan!", delay: 3200 }
    ];

    phases.forEach((phase, idx) => {
        setTimeout(() => {
            resultTitle.innerText = phase.text;
            if (idx === phases.length - 1) {
                revealResult();
            }
        }, phase.delay);
    });

    function revealResult() {
        // Romantic Calculator logic: 
        // 1000% is shown because their love is infinite
        let currentPercent = 0;
        const targetPercent = 100;
        const interval = setInterval(() => {
            currentPercent += 2;
            percentNumber.innerText = currentPercent;
            resultBar.style.width = currentPercent + "%";
            
            if (currentPercent >= targetPercent) {
                clearInterval(interval);
                
                // Show final infinite romantic message
                percentNumber.innerText = "Tak Terhingga ❤️";
                resultBar.style.width = "100%";
                resultTitle.innerText = "Hasil: 1000% Hubungan Murni";
                resultText.innerText = "Karena cinta kita tidak diukur dengan angka kalkulator, melainkan dengan ketulusan hati Riskya yang menerimaku apa adanya. Selamanya aku bersyukur memilikimu.";
                
                // Big burst of hearts
                const rect = calcResult.getBoundingClientRect();
                triggerHeartExplosion(canvas.width/2, rect.top + 80);
                
                btnCalculate.disabled = false;
            }
        }, 30);
    }
});

// 5. Scroll Spy Navigation (highlight active links on scroll)
window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= (sectionTop - 150)) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').includes(current)) {
            link.classList.add('active');
        }
    });
});
