    // --- CANVAS SETUP ---
    const canvas = document.getElementById('simCanvas');
    const ctx = canvas.getContext('2d');
    const actionBtn = document.getElementById('actionBtn');
    const resetBtn = document.getElementById('resetBtn');
    const statusBox = document.getElementById('statusBox');

    // Resize handling
    function resizeCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // --- STATE VARIABLES ---
    let step = 1; 
    let progress = 0; 
    let particles = []; 
    let shakeAmount = 0;

    // --- CONFIG & DATA ---
    const machine = {
        wireColor: "#94a3b8",
        hotColor: "#ef4444", // Red for heat
        threadLines: [],
        isActive: false
    };

    const stepsData = [
        {
            title: "Step 1: Wire Feeding & Cutting",
            text: "In this step, the wire is fed from a mechanical coil. It flows into the machine where a shear blade automatically cuts it to a designated length. The obtained piece is known as a <b>Blank</b>.",
            btn: "Feed & Cut",
            status: "Feeding wire..."
        },
        {
            title: "Step 2: Pre-forming (Upsetting)",
            text: "The billet is pushed into the die. The punch initiates deformation. This is a 'pre-forming' operation to gather material at the end of the blank without buckling it. Note the slight temperature rise.",
            btn: "Pre-form Head",
            status: "Compressing material..."
        },
        {
            title: "Step 3: Final Heading",
            text: "The pre-formed head is severely deformed by a second blow. The metal flows into the die cavity to form the final head shape. <b>Heat is generated</b> due to rapid deformation.",
            btn: "Forge Head",
            status: "High pressure impact!"
        },
        {
            title: "Step 4: Thread Rolling",
            text: "The blank is passed between threading dies. Unlike cutting, rolling impresses the threads into the shank, maintaining grain flow and structural integrity.",
            btn: "Roll Threads",
            status: "Rolling threads..."
        },
        {
            title: "Process Complete",
            text: "The Bolt is finished! Cold heading creates high-quality fasteners with no material waste and superior strength compared to machining.",
            btn: "Finish",
            status: "Inspection Passed."
        }
    ];

    // --- HELPER FUNCTIONS ---
    function drawRect(x, y, w, h, color, stroke=false) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        if(stroke) {
            ctx.strokeStyle = "rgba(0,0,0,0.3)";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
        }
    }

    function interpolateColor(color1, color2, factor) {
        if (arguments.length < 3) { factor = 0.5; }
        var result = result || "#";
        var r1 = parseInt(color1.substring(1, 3), 16);
        var g1 = parseInt(color1.substring(3, 5), 16);
        var b1 = parseInt(color1.substring(5, 7), 16);
        var r2 = parseInt(color2.substring(1, 3), 16);
        var g2 = parseInt(color2.substring(3, 5), 16);
        var b2 = parseInt(color2.substring(5, 7), 16);
        var r = Math.round(r1 + factor * (r2 - r1));
        var g = Math.round(g1 + factor * (g2 - g1));
        var b = Math.round(b1 + factor * (b2 - b1));
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    // --- DRAWING COMPONENTS ---
    
    function drawFloor() {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height * 0.75);
        ctx.lineTo(canvas.width, canvas.height * 0.75);
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#94a3b8";
        ctx.stroke();
        
        // floor pattern
        ctx.fillStyle = "rgba(0,0,0,0.05)";
        ctx.fillRect(0, canvas.height * 0.75, canvas.width, canvas.height * 0.25);
    }

    function drawBlade(x, y) {
        // Industrial Blade
        ctx.fillStyle = "#334155";
        ctx.beginPath();
        ctx.moveTo(x, y); // Top Left
        ctx.lineTo(x + 40, y); // Top Right
        ctx.lineTo(x + 40, y + 120); // Bottom Right
        ctx.lineTo(x + 20, y + 140); // Point
        ctx.lineTo(x, y + 120); // Bottom Left
        ctx.closePath();
        ctx.fill();
        
        // Shine
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(x + 5, y, 10, 110);
    }

    function drawPunch(x, type="flat") {
        const cy = canvas.height * 0.75;
        // Ram
        const grad = ctx.createLinearGradient(x, cy-50, x, cy+50);
        grad.addColorStop(0, "#475569");
        grad.addColorStop(0.5, "#94a3b8");
        grad.addColorStop(1, "#475569");
        
        ctx.fillStyle = grad;
        // The main driving block
        ctx.fillRect(x - 300, cy - 40, 300, 80);
        
        // The Tool Head
        ctx.fillStyle = "#1e293b";
        if(type === "flat") {
            ctx.fillRect(x, cy - 30, 20, 60);
        } else {
            // Shaped die punch
            ctx.beginPath();
            ctx.moveTo(x, cy - 30);
            ctx.lineTo(x + 15, cy - 30);
            ctx.lineTo(x + 15, cy + 30);
            ctx.lineTo(x, cy + 30);
            ctx.lineTo(x - 10, cy); // Cavity shape
            ctx.fill();
        }
    }

    function drawDie(opacity) {
        if(opacity <= 0) return;
        const cx = canvas.width / 2;
        const cy = canvas.height * 0.75;
        
        ctx.globalAlpha = opacity;
        
        // Die Block
        const grad = ctx.createLinearGradient(cx+50, cy-70, cx+150, cy+70);
        grad.addColorStop(0, "#cbd5e1");
        grad.addColorStop(1, "#64748b");
        ctx.fillStyle = grad;
        
        ctx.fillRect(cx + 50, cy - 70, 120, 140);
        ctx.strokeStyle = "#475569";
        ctx.strokeRect(cx + 50, cy - 70, 120, 140);
        
        // Label
        ctx.fillStyle = "#1e293b";
        ctx.font = "bold 14px Arial";
        ctx.fillText("STATIONARY DIE", cx + 55, cy + 90);
        
        ctx.globalAlpha = 1.0;
    }

    function drawBolt(x, w, length, headW, headH, heatLevel) {
        const cy = canvas.height * 0.75;
        
        // Dynamic Color based on Heat
        let baseColor = "#cbd5e1"; // Silver
        let shineColor = "#f1f5f9";
        
        if (heatLevel > 0) {
            baseColor = interpolateColor("#cbd5e1", "#ef4444", heatLevel); // Turn redder
            shineColor = interpolateColor("#f1f5f9", "#fca5a5", heatLevel);
        }

        const grad = ctx.createLinearGradient(x, cy-w/2, x, cy+w/2);
        grad.addColorStop(0, "#64748b");
        grad.addColorStop(0.2, baseColor);
        grad.addColorStop(0.5, shineColor); // Shine
        grad.addColorStop(0.8, baseColor);
        grad.addColorStop(1, "#475569");

        ctx.fillStyle = grad;
        
        // Shank
        ctx.fillRect(x, cy - w/2, length, w);
        
        // Head
        if (headH > 0) {
            const headX = x - headH;
            // Head Gradient
            const hGrad = ctx.createLinearGradient(headX, cy-headW/2, headX, cy+headW/2);
            hGrad.addColorStop(0, "#475569");
            hGrad.addColorStop(0.5, heatLevel > 0.5 ? "#fca5a5" : "#f1f5f9");
            hGrad.addColorStop(1, "#475569");
            
            ctx.fillStyle = hGrad;
            ctx.fillRect(headX, cy - headW/2, headH, headW);
            
            // Hexagon detail lines
            ctx.strokeStyle = "rgba(0,0,0,0.2)";
            ctx.beginPath();
            ctx.moveTo(headX, cy - headW/4);
            ctx.lineTo(headX + headH, cy - headW/4);
            ctx.moveTo(headX, cy + headW/4);
            ctx.lineTo(headX + headH, cy + headW/4);
            ctx.stroke();
        }

        // Threads (Step 4)
        if (machine.threadLines.length > 0) {
            ctx.strokeStyle = "rgba(0,0,0,0.4)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            machine.threadLines.forEach(lx => {
                ctx.moveTo(x + lx, cy - w/2);
                ctx.lineTo(x + lx - 5, cy + w/2);
            });
            ctx.stroke();
        }
    }

    // --- PARTICLES (Sparks/Chips) ---
    class Particle {
        constructor(x, y, type="spark") {
            this.x = x;
            this.y = y;
            this.vx = (Math.random() - 0.5) * 15;
            this.vy = (Math.random() - 1) * 15;
            this.gravity = 0.8;
            this.life = 1.0;
            this.type = type;
        }
        update() {
            this.vy += this.gravity;
            this.x += this.vx;
            this.y += this.vy;
            
            // Bounce floor
            if(this.y > canvas.height * 0.75) {
                this.y = canvas.height * 0.75;
                this.vy *= -0.6; // dampen
            }
            
            this.life -= 0.03;
        }
        draw() {
            ctx.globalAlpha = this.life;
            if(this.type === "spark") {
                ctx.fillStyle = `rgb(255, ${Math.random()*200}, 0)`;
                ctx.fillRect(this.x, this.y, 3, 3);
            } else {
                ctx.fillStyle = "#94a3b8";
                ctx.fillRect(this.x, this.y, 4, 4);
            }
            ctx.globalAlpha = 1.0;
        }
    }

    function spawnParticles(x, y, count, type="spark") {
        for(let i=0; i<count; i++) {
            particles.push(new Particle(x, y, type));
        }
    }

    // --- MAIN LOOP ---
    function animate() {
        // Clear & Shake Effect
        ctx.save();
        if(shakeAmount > 0) {
            let dx = (Math.random() - 0.5) * shakeAmount;
            let dy = (Math.random() - 0.5) * shakeAmount;
            ctx.translate(dx, dy);
            shakeAmount *= 0.9; // Decay shake
            if(shakeAmount < 0.5) shakeAmount = 0;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawFloor();
        
        const cx = canvas.width / 2;
        const cy = canvas.height * 0.75;

        // --- STEP LOGIC ---
        if (step === 1) {
            // Wire feeding
            let wireX = -300 + (progress * (cx + 50)); // Moves past center
            drawBolt(wireX, 40, 800, 0, 0, 0); 
            
            // Cutter
            let bladeY = cy - 200;
            if(progress > 0.7) {
                 bladeY = (cy - 160) + Math.sin((progress - 0.7) * 15) * 60;
                 if(progress > 0.8 && progress < 0.82) {
                     spawnParticles(cx - 50, cy - 20, 3, "spark");
                 }
            }
            drawBlade(cx - 50, bladeY);
        }

        else if (step === 2) {
            drawDie(1);
            // Blank
            let blankX = cx - 50;
            
            // Punch
            let punchX = (cx - 250) + (progress * 200);
            drawPunch(punchX, "flat");
            
            // Deform: Head gets wider, slightly shorter
            let headW = 40 + (progress * 15);
            let headH = progress * 15;
            // Heat: slight red
            drawBolt(blankX, 40, 100, headW, headH, progress * 0.3);

            if(progress > 0.9 && progress < 0.92) {
                spawnParticles(blankX, cy, 5, "dust");
                shakeAmount = 5; // Small shake
            }
        }

        else if (step === 3) {
            drawDie(1);
            let blankX = cx - 50;
            
            // Hammering Punch
            let punchX = (cx - 50) - 15; // Near head
            // Impact motion
            if(progress < 1) {
                punchX -= Math.abs(Math.sin(progress * Math.PI * 2) * 60); 
            }
            drawPunch(punchX, "shape");
            
            // Severe deformation
            let startW = 55; let startH = 15;
            let endW = 80; let endH = 30;
            
            let curW = startW + (endW - startW) * progress;
            let curH = startH + (endH - startH) * progress;
            
            // Heat: Bright Red on impact
            let heat = 0.3 + (Math.sin(progress * Math.PI) * 0.7);
            
            drawBolt(blankX, 40, 100, curW, curH, heat);

            // Big Impacts
            if( (progress > 0.2 && progress < 0.23) || (progress > 0.7 && progress < 0.73) ) {
                spawnParticles(blankX - curH, cy, 15, "spark");
                shakeAmount = 15; // Big shake
            }
        }

        else if (step === 4) {
            // Rolling
            let boltX = (cx - 200) + (progress * 400);
            
            // Top/Bottom Dies
            ctx.fillStyle = "#334155";
            ctx.fillRect(cx - 150, cy - 90, 300, 40); // Top
            ctx.fillRect(cx - 150, cy + 50, 300, 40); // Bottom
            
            // Add threads visual
            if (progress * 100 % 3 < 1) {
                machine.threadLines.push(Math.random() * 90); 
            }
            
            // Spin effect? visual only
            drawBolt(boltX, 40, 100, 80, 30, 0);
        }
        
        else if (step === 5) {
            // Finished
            let boltX = cx - 50;
            
            // Glow effect
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#22c55e";
            drawBolt(boltX, 40, 100, 80, 30, 0);
            ctx.shadowBlur = 0;
            
            ctx.fillStyle = "#22c55e";
            ctx.font = "bold 24px Arial";
            ctx.textAlign = "center";
            ctx.fillText("FINISHED BOLT", cx, cy - 100);
        }

        // Update Particles
        particles.forEach((p, i) => {
            p.update();
            p.draw();
            if(p.life <= 0) particles.splice(i, 1);
        });

        // Animation Progress
        if (machine.isActive && step < 5) {
            progress += 0.008; // Speed
            if (progress >= 1) {
                progress = 1;
                machine.isActive = false;
                enableNext();
            }
        }
        
        ctx.restore();
        requestAnimationFrame(animate);
    }

    // --- UI LOGIC ---
    
    function enableNext() {
        if(step < 5) {
            actionBtn.innerHTML = "Next Step >>";
            actionBtn.disabled = false;
            actionBtn.classList.add('pulse');
            statusBox.style.borderColor = "#22c55e";
            statusBox.style.color = "#22c55e";
            statusBox.innerText = "Step Complete.";
        } else {
            finishLab();
        }
    }

    actionBtn.addEventListener('click', () => {
        if(actionBtn.innerHTML.includes("Next")) {
            step++;
            progress = 0;
            particles = [];
            machine.threadLines = [];
            updateUI();
            actionBtn.innerHTML = stepsData[step-1].btn;
        } else {
            // Start action
            machine.isActive = true;
            actionBtn.disabled = true;
            actionBtn.innerHTML = "Processing...";
            actionBtn.classList.remove('pulse');
            statusBox.innerText = stepsData[step-1].status;
            statusBox.style.borderColor = "#eab308"; // amber
            statusBox.style.color = "#eab308";
        }
    });
    
    function updateUI() {
        if(step > 5) return;
        
        // Text
        const data = stepsData[step-1];
        document.getElementById('stepTitle').innerText = data.title;
        document.getElementById('stepContent').innerHTML = `<p>${data.text}</p>`;
        actionBtn.innerHTML = data.btn;
        
        // Dots
        document.querySelectorAll('.step-dot').forEach((d, i) => {
            if(i+1 < step) {
                d.className = "step-dot completed";
                d.innerHTML = "✓";
            } else if(i+1 === step) {
                d.className = "step-dot active";
                d.innerHTML = step;
            } else {
                d.className = "step-dot";
                d.innerHTML = i+1;
            }
        });
    }
    
    function finishLab() {
        document.getElementById('stepTitle').innerText = stepsData[4].title;
        document.getElementById('stepContent').innerHTML = `<p>${stepsData[4].text}</p>`;
        actionBtn.style.display = 'none';
        resetBtn.style.display = 'flex';
        statusBox.innerText = "LAB COMPLETE";
        
        document.querySelectorAll('.step-dot').forEach(d => {
            d.className = "step-dot completed";
            d.innerHTML = "✓";
        });
    }
    
    resetBtn.addEventListener('click', () => {
        step = 1;
        progress = 0;
        machine.isActive = false;
        resetBtn.style.display = 'none';
        actionBtn.style.display = 'flex';
        actionBtn.innerHTML = stepsData[0].btn;
        actionBtn.disabled = false;
        updateUI();
    });

    // Start Loop
    animate();

