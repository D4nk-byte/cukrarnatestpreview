const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;
const PUBLIC_DIR = path.join(BASE_DIR, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
const ORDERS_FILE = path.join(BASE_DIR, 'orders.json');
const USERS_FILE = path.join(BASE_DIR, 'users.json');
const CAPACITY_FILE = path.join(BASE_DIR, 'calendar_capacity.json');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

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

function formatCzechDateTime(date = new Date()) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${d}.${m}.${y} ${h}:${min}`;
}

// Read orders with automatic 24h expiration check for "platné" orders
function readOrders() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, 'utf-8');
      const orders = JSON.parse(data || '[]');
      
      let changed = false;
      const now = Date.now();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

      orders.forEach(o => {
        if (o.status === 'platné' && o.pickup_date) {
          const pickupTimeStr = o.pickup_time || '17:00';
          const pickupDt = new Date(`${o.pickup_date}T${pickupTimeStr}:00`);
          if (!isNaN(pickupDt.getTime())) {
            // Check if 24 hours elapsed past pickup
            if (now > pickupDt.getTime() + TWENTY_FOUR_HOURS) {
              o.status = 'nevyzvednuté';
              o.history = o.history || [];
              o.history.push({
                employee: 'Systém',
                timestamp: formatCzechDateTime(new Date()),
                change_text: 'Automaticky zařazeno do nevyzvednutých po 24 hodinách od termínu vyzvednutí'
              });
              changed = true;
            }
          }
        }
      });

      if (changed) {
        saveOrders(orders);
      }
      return orders;
    }
  } catch (err) {
    console.error('Chyba při čtení orders.json:', err);
  }
  return [];
}

function saveOrders(orders) {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Chyba při zápisu orders.json:', err);
    return false;
  }
}

function readUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8') || '[]');
    }
  } catch (e) {}
  return [];
}

function readCapacity() {
  try {
    if (fs.existsSync(CAPACITY_FILE)) {
      return JSON.parse(fs.readFileSync(CAPACITY_FILE, 'utf-8') || '{}');
    }
  } catch (e) {}
  return {};
}

function saveCapacity(data) {
  try {
    fs.writeFileSync(CAPACITY_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    return false;
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 25 * 1024 * 1024) { // 25MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
          return resolve(JSON.parse(body));
        }
        const params = new URLSearchParams(body);
        const obj = {};
        for (const [k, v] of params.entries()) obj[k] = v;
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

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Employee-Role, X-Employee-Name');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // --- API 1: USERS & AUTHENTICATION ---
  if (reqPath === '/api/login' && req.method === 'POST') {
    const body = await parseBody(req);
    const { username, pin } = body;
    const users = readUsers();
    const user = users.find(u => u.username.toLowerCase() === (username || '').toLowerCase() && String(u.pin) === String(pin));

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (user) {
      res.writeHead(200);
      return res.end(JSON.stringify({
        success: true,
        user: { id: user.id, username: user.username, name: user.name, role: user.role }
      }));
    } else {
      res.writeHead(401);
      return res.end(JSON.stringify({ success: false, message: 'Nesprávné přihlašovací jméno nebo PIN kód.' }));
    }
  }

  if (reqPath === '/api/users' && req.method === 'GET') {
    const users = readUsers().map(u => ({ id: u.id, username: u.username, name: u.name, role: u.role }));
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.writeHead(200);
    return res.end(JSON.stringify({ success: true, data: users }));
  }

  // --- API 2: CALENDAR CAPACITIES (Zelená / Žlutá / Červená) ---
  if (reqPath === '/api/calendar-capacity') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (req.method === 'GET') {
      const customCapacities = readCapacity();
      const orders = readOrders();
      // Count cake orders per day
      const dayCounts = {};
      orders.forEach(o => {
        if (o.status !== 'neplatné' && o.pickup_date && (o.cake || o.order_type === 'dort' || o.order_type === 'kombinace')) {
          dayCounts[o.pickup_date] = (dayCounts[o.pickup_date] || 0) + 1;
        }
      });

      // Merge dynamic counts with custom overrides
      const result = { ...customCapacities };
      Object.entries(dayCounts).forEach(([d, count]) => {
        if (!result[d]) {
          if (count >= 5) result[d] = 'red';
          else if (count >= 2) result[d] = 'yellow';
        }
      });

      res.writeHead(200);
      return res.end(JSON.stringify({ success: true, data: result }));
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const { date, status } = body;
      const data = readCapacity();
      if (status === 'green' || !status) {
        delete data[date];
      } else {
        data[date] = status; // yellow or red
      }
      saveCapacity(data);
      res.writeHead(200);
      return res.end(JSON.stringify({ success: true, data }));
    }
  }

  // --- API 3: IMAGE UPLOAD FOR CAKE PHOTO ---
  if (reqPath === '/api/upload-image' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { base64Data, filename } = body;
      if (!base64Data) {
        res.writeHead(400);
        return res.end(JSON.stringify({ success: false, message: 'Chybí obrazová data' }));
      }
      const matches = base64Data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (!matches) {
        res.writeHead(400);
        return res.end(JSON.stringify({ success: false, message: 'Neplatný formát obrázku' }));
      }
      const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      const safeName = `cake_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, safeName);
      fs.writeFileSync(filePath, buffer);

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.writeHead(200);
      return res.end(JSON.stringify({ success: true, url: `uploads/${safeName}` }));
    } catch (e) {
      res.writeHead(500);
      return res.end(JSON.stringify({ success: false, message: e.message }));
    }
  }

  // --- API 4: ORDERS (GET, POST, DELETE) ---
  if (reqPath === '/api/orders' || reqPath === '/wp-admin/admin-ajax.php') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // 1. GET ALL ORDERS
    if (req.method === 'GET') {
      const orders = readOrders();
      res.writeHead(200);
      return res.end(JSON.stringify({ success: true, data: orders }));
    }

    // 2. CREATE / UPDATE ORDER
    if (req.method === 'POST') {
      try {
        const body = await parseBody(req);
        let orders = readOrders();

        const employeeName = req.headers['x-employee-name'] || body.employee_name || 'Ester';
        const employeeRole = req.headers['x-employee-role'] || body.employee_role || 'prodavačka';
        const isCustomer = body.created_by_customer === true || body.created_by === 'Zákazník z webu';

        // Check if updating existing order
        if (body.id && orders.some(o => String(o.id) === String(body.id))) {
          const idx = orders.findIndex(o => String(o.id) === String(body.id));
          const old = orders[idx];

          // Permission check: only admin can change status from "nevyřízeno" to "platné"
          if (old.status === 'nevyřízeno' && body.status === 'platné' && employeeRole !== 'admin') {
            res.writeHead(403);
            return res.end(JSON.stringify({
              success: false,
              message: 'Nemáte oprávnění schválit nevyřízenou objednávku. Toto může provést pouze administrátor.'
            }));
          }

          // Compute change diff for audit trail
          const diffs = [];
          if (body.customer && body.customer !== old.customer) diffs.push(`zákazník z: "${old.customer}" na: "${body.customer}"`);
          if (body.phone && body.phone !== old.phone) diffs.push(`telefon z: "${old.phone}" na: "${body.phone}"`);
          if (body.pickup_date && body.pickup_date !== old.pickup_date) diffs.push(`termín z: ${old.pickup_date} na: ${body.pickup_date}`);
          if (body.status && body.status !== old.status) diffs.push(`stav z: ${old.status} na: ${body.status}`);
          if (body.price !== undefined && String(body.price) !== String(old.price)) diffs.push(`cena z: ${old.price} Kč na: ${body.price} Kč`);
          
          // Cake details diff
          if (body.cake && old.cake) {
            if (body.cake.sponge && body.cake.sponge !== old.cake.sponge) diffs.push(`korpus z: ${old.cake.sponge} na: ${body.cake.sponge}`);
            if (body.cake.filling && body.cake.filling !== old.cake.filling) diffs.push(`náplň z: ${old.cake.filling} na: ${body.cake.filling}`);
            if (body.cake.finish && body.cake.finish !== old.cake.finish) diffs.push(`potah z: ${old.cake.finish} na: ${body.cake.finish}`);
          }

          const changeText = diffs.length > 0 ? `Změněno: ${diffs.join(', ')}` : (body.change_note || 'Úprava objednávky');

          const historyEntry = {
            employee: employeeName,
            timestamp: formatCzechDateTime(new Date()),
            change_text: `Změněno zaměstnancem ${employeeName} ${formatCzechDateTime(new Date())} (${changeText})`,
            prev_snapshot: {
              customer: old.customer,
              phone: old.phone,
              status: old.status,
              cake: old.cake,
              desserts: old.desserts,
              pickup_date: old.pickup_date
            }
          };

          const updated = {
            ...old,
            ...body,
            id: old.id,
            history: [historyEntry, ...(old.history || [])]
          };

          orders[idx] = updated;
          saveOrders(orders);
          res.writeHead(200);
          return res.end(JSON.stringify({ success: true, data: updated }));
        }

        // New Order creation
        const orderId = String(Date.now()).slice(-6);
        let initialStatus = 'nevyřízeno';
        let createdBy = 'Zákazník z webu';

        if (!isCustomer) {
          initialStatus = 'platné'; // orders placed by clerk or admin are immediately "platné"
          createdBy = `${employeeName} (${employeeRole === 'admin' ? 'Admin' : 'Prodavačka'})`;
        }

        const newOrder = {
          id: orderId,
          customer: body.customer || 'Zákazník',
          phone: body.phone || '',
          email: body.email || '',
          created_at: new Date().toISOString(),
          created_by: createdBy,
          order_type: body.order_type || (body.cake && body.desserts && body.desserts.length ? 'kombinace' : (body.cake ? 'dort' : 'zakusek')),
          desserts: Array.isArray(body.desserts) ? body.desserts : [],
          cake: body.cake || null,
          pickup_date: body.pickup_date || '',
          pickup_time: body.pickup_time || '10:00',
          price: String(body.price || '0'),
          status: body.status || initialStatus,
          history: [
            {
              employee: createdBy,
              timestamp: formatCzechDateTime(new Date()),
              change_text: `Objednávka založena (${createdBy}) se stavem "${body.status || initialStatus}"`
            }
          ]
        };

        orders.unshift(newOrder);
        saveOrders(orders);
        res.writeHead(200);
        return res.end(JSON.stringify({ success: true, data: newOrder }));
      } catch (err) {
        res.writeHead(500);
        return res.end(JSON.stringify({ success: false, message: err.message }));
      }
    }

    // 3. DELETE ORDER (Only Admin)
    if (req.method === 'DELETE') {
      const id = parsedUrl.searchParams.get('id');
      const employeeRole = req.headers['x-employee-role'] || 'prodavačka';

      if (employeeRole !== 'admin') {
        res.writeHead(403);
        return res.end(JSON.stringify({
          success: false,
          message: 'Prodavačka nemůže mazat objednávky. Tuto akci smí provést pouze administrátor.'
        }));
      }

      let orders = readOrders();
      orders = orders.filter(o => String(o.id) !== String(id));
      saveOrders(orders);
      res.writeHead(200);
      return res.end(JSON.stringify({ success: true, message: 'Objednávka smazána' }));
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
          <h1>404 - Stránka nenalezena</h1>
          <p><a href="/">Zpět na hlavní stránku</a></p>
        </body>
        </html>
      `);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const headers = { 'Content-Type': contentType };
    if (['.html', '.json', '.js', '.css'].includes(ext)) {
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
  console.log(`🍰 Cukrářství Madel - Kompletní objednávkový systém 2.0`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
