const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // Menggunakan node-fetch untuk HTTP requests

// Fungsi untuk mengecek status proxy dan warp dari IP dan port
async function checkIP(ip, port) {
    const proxyApiUrl = `https://p01--boiling-frame--kw6dd7bjv2nr.code.run/check?ip=${ip}&host=speed.cloudflare.com&port=${port}&tls=true`;

    try {
        const proxyApiResponse = await fetch(proxyApiUrl);
        const proxyApiData = await proxyApiResponse.json();

        const proxyStatus = proxyApiData.proxyip ? '✔ AKTIF ✔' : '✘ DEAD ✘';
        const warpStatus = proxyApiData.warp ? '✔ ON ✔' : '✘ OFF ✘';

        // Pengecekan API kedua tetap dilakukan, meskipun API pertama gagal
        const ispInfo = await getISPInfo(ip);

        return { ip, port, proxyStatus, warpStatus, ispInfo };
    } catch (error) {
        // API pertama gagal, namun tetap lanjut ke API kedua
        const ispInfo = await getISPInfo(ip);
        return { ip, port, proxyStatus: '✘ DEAD ✘', warpStatus: '✘ OFF ✘', ispInfo };
    }
}

// Fungsi untuk mendapatkan informasi ISP dan negara dari IP menggunakan ipinfo.io
async function getISPInfo(ip) {
    const ispApiUrl = `https://ipinfo.io/${ip}/json`;

    try {
        const ispApiResponse = await fetch(ispApiUrl);
        const ispApiData = await ispApiResponse.json();

        if (ispApiData.error) {
            throw new Error('Failed to fetch ISP data');
        }

        const country = ispApiData.country || 'Unknown';
        const asn = ispApiData.org ? ispApiData.org.match(/^AS\d+/)[0] : 'Unknown'; // ASN
        const isp = ispApiData.org ? ispApiData.org.replace(/^AS\d+\s+/, '') : 'Unknown'; // ISP
        const city = ispApiData.city || 'Unknown';

        return { country, asn, isp, city };
    } catch (error) {
        return { country: 'Unknown', asn: 'Unknown', isp: 'Unknown', city: 'Unknown' };
    }
}

// Fungsi untuk membaca dan memproses semua file .txt dalam repositori
async function processAllFilesInRepo() {
    const directoryPath = './'; // Direktori repositori Anda, bisa disesuaikan
    const files = fs.readdirSync(directoryPath); // Membaca seluruh file di dalam direktori

    const txtFiles = files.filter(file => path.extname(file) === '.txt'); // Menyaring file dengan ekstensi .txt

    for (const txtFile of txtFiles) {
        console.log(`Processing file: ${txtFile}`);
        const filePath = path.join(directoryPath, txtFile);
        const data = fs.readFileSync(filePath, 'utf8');

        const ipList = data.split('\n').filter(line => line.trim() !== '');
        
        // Memfilter baris yang tidak sesuai dengan format IP:PORT
        const validIPList = ipList.filter(line => isValidIPPort(line.trim()));

        for (const line of validIPList) {
            const [ip, port] = line.split(':');
            const result = await checkIP(ip.trim(), port.trim());
            logResult(result);
        }
    }
}

// Fungsi untuk memeriksa apakah string sesuai dengan format IP:PORT
function isValidIPPort(input) {
    // Menghapus komentar (karakter # dan sesudahnya)
    input = input.split('#')[0].trim(); // Menghapus bagian komentar dan whitespace

    // Regex untuk mencocokkan IP:PORT dengan karakter tambahan yang akan diabaikan
    const regex = /^(\d{1,3}\.){3}\d{1,3}:(\d+)$/; // IP:PORT yang valid, hanya IP dan PORT
    const match = input.match(regex);

    if (match) {
        const ip = match[0].split(':')[0]; // Ambil bagian IP
        const port = match[2]; // Ambil bagian PORT
        return { ip, port };
    }
    return null; // Jika tidak sesuai format
}

// Fungsi untuk mencetak hasil dalam format yang rapih
function logResult(result) {
    const { ip, port, proxyStatus, warpStatus, ispInfo } = result;

    console.log(`
    ===================================
    IP: ${ip}
    Port: ${port}
    Proxy Status: ${proxyStatus}
    Warp Status: ${warpStatus}
    ISP: ${ispInfo.isp} (${ispInfo.country})
    ASN: ${ispInfo.asn}
    City: ${ispInfo.city}
    ===================================
    `);
}

// Mulai pemrosesan file
processAllFilesInRepo();
