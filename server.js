const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;
const PUBLIC_DIR = path.join(BASE_DIR, 'public');
const ORDERS_FILE = path.join(BASE_DIR, 'orders.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// Helper to read orders
function readOrders() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, 'utf-8');
      return JSON.parse(data || '[]');
    }
  } catch (err) {
    console.error('Error reading orders:', err);
  }
  return [];
}

// Helper to save orders
function saveOrders(orders) {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing orders:', err);
    return false;
  }
}

// Parse request body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
          return resolve(JSON.parse(body));
        }
        // handle urlencoded or FormData params
        const params = new URLSearchParams(body);
        const obj = {};
        for (const [key, value] of params.entries()) {
          obj[key] = value;
        }
        resolve(obj);
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const reqPath = decodeURI(parsedUrl.pathname);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // --- API ENDPOINTS FOR ORDER SYSTEM (truhlarstvijarkulis.cz/cukrarna compatibility) ---
  if (reqPath === '/api/orders' || reqPath === '/wp-admin/admin-ajax.php') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // 1. GET Orders List
    if (req.method === 'GET') {
      const orders = readOrders();
      res.writeHead(200);
      return res.end(JSON.stringify({ success: true, data: orders }));
    }

    // 2. POST Save / Update / Action
    if (req.method === 'POST') {
      try {
        const body = await parseBody(req);
        const action = body.action || '';
        let orders = readOrders();

        // Compatibility with Jarkuliš WordPress AJAX actions
        if (action === 'cukrarna_test_list' || action === 'cukrarna_demo_list') {
          res.writeHead(200);
          return res.end(JSON.stringify({ success: true, data: orders }));
        }

        if (action === 'cukrarna_test_delete' || action === 'cukrarna_demo_delete') {
          const id = String(body.id);
          orders = orders.filter(o => String(o.id) !== id);
          saveOrders(orders);
          res.writeHead(200);
          return res.end(JSON.stringify({ success: true, data: { deleted: id } }));
        }

        // Standard save (new or edit)
        let orderData = body;
        if (body.data) {
          try { orderData = typeof body.data === 'string' ? JSON.parse(body.data) : body.data; } catch(e){}
        }

        const orderId = orderData.id ? String(orderData.id) : String(Date.now());
        const existingIdx = orders.findIndex(o => String(o.id) === orderId);

        const newOrder = {
          id: orderId,
          customer: orderData.customer || 'Neznámý zákazník',
          phone: orderData.phone || '',
          email: orderData.email || '',
          kind: orderData.kind || 'Narozeninový',
          portions: orderData.portions || '12',
          shape: orderData.shape || '',
          diameter: orderData.diameter || '',
          floors: orderData.floors || '1',
          sponge: orderData.sponge || '',
          cream: orderData.cream || '',
          filling: orderData.filling || '',
          finish: orderData.finish || '',
          diet: orderData.diet || '',
          decor: orderData.decor || '',
          notes: orderData.notes || '',
          pickup_date: orderData.pickup_date || '',
          pickup_time: orderData.pickup_time || '10:00',
          price: String(orderData.price || '0'),
          deposit: String(orderData.deposit || '0'),
          status: orderData.status || 'Nová',
          details: JSON.stringify({
            shape: orderData.shape,
            diameter: orderData.diameter,
            floors: orderData.floors,
            sponge: orderData.sponge,
            cream: orderData.cream,
            filling: orderData.filling,
            finish: orderData.finish,
            diet: orderData.diet,
            decor: orderData.decor,
            notes: orderData.notes
          }),
          created_at: orderData.created_at || new Date().toISOString()
        };

        if (existingIdx >= 0) {
          orders[existingIdx] = { ...orders[existingIdx], ...newOrder, id: orderId };
        } else {
          orders.unshift(newOrder);
        }

        saveOrders(orders);
        res.writeHead(200);
        return res.end(JSON.stringify({ success: true, data: newOrder }));
      } catch (err) {
        res.writeHead(500);
        return res.end(JSON.stringify({ success: false, data: { message: err.message } }));
      }
    }

    // 3. DELETE Order
    if (req.method === 'DELETE') {
      const id = parsedUrl.searchParams.get('id');
      if (id) {
        let orders = readOrders();
        orders = orders.filter(o => String(o.id) !== String(id));
        saveOrders(orders);
        res.writeHead(200);
        return res.end(JSON.stringify({ success: true, data: { deleted: id } }));
      }
      res.writeHead(400);
      return res.end(JSON.stringify({ success: false, data: { message: 'Missing ID' } }));
    }
  }

  // --- STATIC FILE SERVING ---
  let targetPath = reqPath;
  if (targetPath === '/' || targetPath === '') {
    targetPath = '/index.html';
  }

  let filePath = path.join(BASE_DIR, targetPath);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(PUBLIC_DIR, targetPath);
  }

  // Security check to avoid directory traversal
  const safeBase = BASE_DIR;
  if (!filePath.startsWith(safeBase)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`
        <!DOCTYPE html>
        <html lang="cs">
        <head><meta charset="utf-8"><title>404 - Nenalezeno | Cukrářství Madel</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:50px;">
          <h1>404 - Stránka nebo soubor nenalezen</h1>
          <p><a href="/">Zpět na přehled</a></p>
        </body>
        </html>
      `);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const headers = { 'Content-Type': contentType };
    if (ext === '.html' || ext === '.json' || ext === '.js' || ext === '.css') {
      headers['Cache-Control'] = 'no-cache';
    } else {
      headers['Cache-Control'] = 'public, max-age=86400';
    }

    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🍰 Cukrářství Madel - Objednávkový systém běží na:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
