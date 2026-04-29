/**
 * direct-scan.js — Scanner tailored for Direct Allotment
 */

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetId = urlParams.get('targetId');
    const targetType = urlParams.get('type');
    const targetName = urlParams.get('name');

    if (targetName) {
        document.getElementById('scan-target-title').textContent = `Allot to ${targetName}`;
    }

    // "Add Manually" simply passes the params forward WITHOUT scanned data
    document.getElementById('add-manually-btn').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = `direct-allot.html?targetId=${targetId}&type=${targetType}&name=${targetName}`;
    });

    const html5QrCode = new Html5Qrcode("reader");
    
    // On success, pass the params forward WITH scanned data
    const processScan = (text) => {
        html5QrCode.stop().then(() => {
            window.location.href = `direct-allot.html?targetId=${targetId}&type=${targetType}&name=${targetName}&data=${encodeURIComponent(text)}`;
        }).catch(err => {
            window.location.href = `direct-allot.html?targetId=${targetId}&type=${targetType}&name=${targetName}&data=${encodeURIComponent(text)}`;
        });
    };

    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 }, processScan)
        .catch(err => console.log("Camera init failed."));

    document.getElementById('upload-btn').addEventListener('click', () => document.getElementById('qr-upload-input').click());
    document.getElementById('qr-upload-input').addEventListener('change', e => {
        if (e.target.files.length > 0) {
            html5QrCode.scanFile(e.target.files[0], true).then(processScan).catch(err => alert("No QR code found."));
        }
    });
});