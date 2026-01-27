const qrisForm = document.getElementById('qrisForm');
const amountInput = document.getElementById('amountInput');
const realAmountInput = document.getElementById('realAmountInput');
const serviceFeeInput = document.getElementById('serviceFee');
const feeOptionsWrapper = document.getElementById('feeOptionsWrapper');
const resultArea = document.getElementById('resultArea');
const qrcodeElement = document.getElementById('qrcode');
const merchantInfoElement = document.getElementById('merchantInfo');
const downloadBtn = document.getElementById('downloadBtn');

let qrisStaticCode = localStorage.getItem('qrisStaticCode') || '';
if (qrisStaticCode) displayMerchantInfo(qrisStaticCode);

// Toggle Buttons
document.querySelectorAll('.btn-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btn-toggle').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const val = btn.getAttribute('data-value');
    serviceFeeInput.value = val;
    feeOptionsWrapper.style.display = (val === 'y') ? 'block' : 'none';
  });
});

// Quick Amounts
document.querySelectorAll('.btn-chip').forEach(button => {
  button.addEventListener('click', () => {
    const val = button.getAttribute('data-amount');
    realAmountInput.value = val;
    amountInput.value = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  });
});

amountInput.addEventListener('input', (e) => {
  let value = e.target.value.replace(/[^\d]/g, "");
  realAmountInput.value = value || 0;
  e.target.value = value ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value) : "";
});

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.getElementById('qrisCanvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height);
      const code = jsQR(data.data, data.width, data.height);
      if (code) {
        qrisStaticCode = code.data;
        localStorage.setItem('qrisStaticCode', qrisStaticCode);
        displayMerchantInfo(qrisStaticCode);
      }
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}
document.getElementById('qrisImageInput').addEventListener('change', handleImageUpload);

function displayMerchantInfo(qrisCode) {
  const nameMatch = qrisCode.match(/59(\d{2})([^\d]{2,})/);
  if (nameMatch) {
    const name = nameMatch[2].substring(0, parseInt(nameMatch[1]));
    merchantInfoElement.innerHTML = `<p>Merchant Detected:<br><span style="color:white; font-size:1.1rem; font-weight:800;">${name}</span></p>`;
    merchantInfoElement.style.display = 'block';
  }
}

qrisForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!qrisStaticCode) return alert('Please upload QRIS first.');
  
  resultArea.classList.add('visible');
  resultArea.style.display = 'block';
  downloadBtn.style.display = 'none';

  const wrapper = document.querySelector('.qr-wrapper');
  wrapper.classList.remove('active');
  qrcodeElement.innerHTML = '';

  const nominal = realAmountInput.value;
  const fType = document.getElementById('feeType').value;
  const fVal = document.getElementById('feeValue').value;
  let tax = '';
  if (serviceFeeInput.value === 'y' && fVal) {
    tax = fType === 'r' ? "55020256" + String(fVal.length).padStart(2, '0') + fVal : "55020357" + String(fVal.length).padStart(2, '0') + fVal;
  }
  let base = qrisStaticCode.slice(0, -4).replace("010211", "010212");
  const [prefix, suffix] = base.split("5802ID");
  const nominalData = "54" + String(nominal.length).padStart(2, '0') + nominal;
  const result = `${prefix}${nominalData}${tax}5802ID${suffix}`;
  const finalQR = result + convertCRC16(result);

  // REVISED: Balanced Size (180px vs old 220px)
  new QRCode(qrcodeElement, { text: finalQR, width: 180, height: 180 });
  
  setTimeout(() => {
    wrapper.classList.add('active');
    setTimeout(() => { downloadBtn.style.display = 'inline-flex'; }, 1000);
  }, 100);
});

downloadBtn.addEventListener('click', () => {
  const img = qrcodeElement.querySelector('img');
  if (!img) return;
  const link = document.createElement('a');
  link.href = img.src; link.download = `QR-miww-${Date.now()}.png`;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
});

function convertCRC16(str) {
  let crc = 0xFFFF;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}