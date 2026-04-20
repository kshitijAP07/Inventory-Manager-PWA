// Step Navigation Logic
function goToStep(step) {
    // Hide all views
    document.getElementById('step-1').style.display = 'none';
    document.getElementById('step-2').style.display = 'none';
    document.getElementById('step-3').style.display = 'none';

    // Show targeted view
    document.getElementById(`step-${step}`).style.display = 'block';

    // Update Stepper fill width
    const fillBar = document.getElementById('stepper-fill');
    if (step === 1) fillBar.style.width = '33%';
    if (step === 2) fillBar.style.width = '66%';
    if (step === 3) fillBar.style.width = '100%';

    // Handle Camera Lifecycle
    if (step === 1) {
        startScanner();
    } else {
        stopScanner();
    }
}

// Submit Simulation
function submitAllotment() {
    alert("Kit Allotted Successfully!");
    window.location.href = 'im-dashboard.html';
}

// Scanner Logic
let html5QrCode;

function startScanner() {
    if(!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }
    
    const onScanSuccess = (decodedText) => {
        // Stop scanning, insert data, and move to step 2 automatically!
        stopScanner().then(() => {
            document.getElementById('scanned-data-placeholder').innerText = decodedText;
            goToStep(2);
        });
    };

    const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
    
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
        .catch(err => console.log("Scanner paused or failed to load."));
}

function stopScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
        return html5QrCode.stop();
    }
    return Promise.resolve();
}

// Start scanner on initial load
document.addEventListener('DOMContentLoaded', () => {
    startScanner();
    
    // Gallery Upload Logic
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('qr-upload-input');

    if(uploadBtn) {
        uploadBtn.addEventListener('click', () => fileInput.click());
    }

    if(fileInput) {
        fileInput.addEventListener('change', e => {
            if (e.target.files.length == 0) return;
            html5QrCode.scanFile(e.target.files[0], true)
            .then(decodedText => {
                document.getElementById('scanned-data-placeholder').innerText = decodedText;
                goToStep(2);
            })
            .catch(err => alert("No QR code detected."));
        });
    }
});