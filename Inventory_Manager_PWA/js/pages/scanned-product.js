document.addEventListener('DOMContentLoaded', () => {
    
    // Initialize the Scanner using the direct Html5Qrcode class
    const html5QrCode = new Html5Qrcode("reader");

    // Success Callback
    // Success Callback
    const onScanSuccess = (decodedText, decodedResult) => {
        // Stop scanning after a successful read
        html5QrCode.stop().then((ignore) => {
            // Route to the add-product page, passing the scanned text in the URL
            window.location.href = `add-product.html?mode=scanned&data=${encodeURIComponent(decodedText)}`;
        }).catch((err) => {
            console.log("Error stopping scanner", err);
        });
    };

    // Configuration
    const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0 // Forces square aspect ratio to fit your UI
    };

    // Start Scanner on rear camera
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
    .catch((err) => {
        console.warn("Camera init failed, trying to fallback or show error", err);
        document.getElementById("reader").innerHTML = `<p style="text-align:center; padding: 20px;">Please allow camera permissions to scan.</p>`;
    });

    // --- Upload from Gallery Logic ---
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('qr-upload-input');

    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', e => {
        if (e.target.files.length == 0) {
            return;
        }
        
        const imageFile = e.target.files[0];
        
        // Use the library's built-in file scanner
        html5QrCode.scanFile(imageFile, true)
        .then(decodedText => {
            alert("QR Code Extracted from Image!\nData: " + decodedText);
        })
        .catch(err => {
            alert("Could not detect a QR code in that image.");
            console.log("File scan error", err);
        });
    });
});