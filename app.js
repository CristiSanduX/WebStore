const cookieParser = require('cookie-parser')
const session = require('express-session');
const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const bodyParser = require("body-parser");
const fs = require('fs');
const fs2 = require("fs").promises; // modulul fs pentru a citi fișierul JSON
const app = express();
const port = 6789;

//Conexiunea cu baza de date MySql
const mysql = require('mysql');
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "12345678",
  database: "cumparaturi"
});

db.connect(function(err) {
  if (err) throw err;
  console.log("Conectat la baza de date!");
});

//Butoanele de creare și încărcare
app.get("/creare-bd", (req, res) => {
  let sql = "CREATE TABLE produse(id int AUTO_INCREMENT, nume VARCHAR(255), pret DECIMAL(10,2), PRIMARY KEY(id))";
  db.query(sql, (err, result) => {
    if(err) throw err;
    console.log(result);
    res.redirect("/");
  });
});
app.get("/incarcare-bd", (req, res) => {
  let sql = "INSERT INTO produse (nume, pret) VALUES ?";
  let values = [
    ['Aparat foto digital Nikon COOLPIX P1000', 4499.99],
    ['Obiectiv foto Canon EF 50mm', 629.99],
    ['Aparat foto DSLR Canon EOS 2000D', 3420.00]
  ];
  db.query(sql, [values], function(err, result) {
    if (err) throw err;
    console.log("Numărul de înregistrări adăugate: " + result.affectedRows);
    res.redirect("/");
  });
});

// Funcție pentru a extrage produsele din baza de date
function getProduse(callback) {
  const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'cumparaturi'
  });

  connection.connect();

  connection.query('SELECT * FROM produse', (error, results) => {
    if (error) throw error;
    callback(results);
  });

  connection.end();
}

app.use(session({
  secret: 'secret-key', // cheia secretă utilizată pentru a cripta cookie-ul de sesiune
  resave: false, // salvează sesiunea chiar dacă nu a fost modificată
  saveUninitialized: false // nu salvează sesiunea dacă nu a fost inițializată
}));
app.use(cookieParser());
// directorul 'views' va conține fișierele .ejs (html + js executat la server)
app.set("view engine", "ejs");
// suport pentru layout-uri - implicit fișierul care reprezintă template-ul site-ului este views/layout.ejs
app.use(expressLayouts);
app.set("layout", "layout");
// directorul 'public' va conține toate resursele accesibile direct de către client (e.g., fișiere css, javascript, imagini)
app.use(express.static("public"));
// corpul mesajului poate fi interpretat ca json; datele de la formular se găsesc în format json în req.body
app.use(bodyParser.json());
// utilizarea unui algoritm de deep parsing care suportă obiecte în obiecte
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

const citireIntrebari = async () => {
  try {
    const data = await fs2.readFile("./intrebari.json");
    const intrebari = JSON.parse(data);
    return intrebari;
  } catch (error) {
    console.log("Fisierul json nu a putut fi citit", error);
    return [];
  }
};

// la accesarea din browser adresei http://localhost:6789/ se va returna textul 'Hello World'
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res

// middleware pentru verificarea sesiunii de autentificare
const autentificareMiddleware = (req, res, next) => {
  if (req.session.utilizator) {
    res.locals.utilizator = req.session.utilizator; // adaugă numele utilizatorului în obiectul locals
    next(); // permit accesul către ruta protejată
  } else {
    res.redirect('/autentificare');
  }
};



app.get("/", autentificareMiddleware, (req, res) => {
  const utilizator = req.session.utilizator;
  getProduse((produse) => {
    res.render('index', {
      layout: "layout",
      utilizator: utilizator,
      produse: produse
    });
  });
});




// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția specificată
app.get("/chestionar",autentificareMiddleware, async (req, res) => {
  // în fișierul views/chestionar.ejs este accesibilă variabila 'intrebari' care conține vectorul de întrebări
  const listaIntrebari = await citireIntrebari();
  res.render("chestionar", {
    intrebari: listaIntrebari,
    layout: "layout",
  });
});
app.get("/autentificare", (req, res) => {
  res.clearCookie("mesajEroare");
  res.render("autentificare", {
    layout: "layout",
    mesajEroare: req.cookies.mesajEroare
  });
});
app.get('/delogare', (req, res) => {
  res.clearCookie('utilizator');
  req.session.destroy(); // ștergem sesiunea
  res.redirect('/');
});


app.post('/verificare-autentificare', (req, res)  => {

  console.log(req.body);
  const { utilizator, parola } = req.body;

// citirea datelor din fisierul utilizatori.json
const fisierUtilizatori = fs.readFileSync('utilizatori.json');
const utilizatori = JSON.parse(fisierUtilizatori);

// căutarea utilizatorului în fișierul utilizatori.json
const utilizatorGasit = utilizatori.find(u => u.utilizator === utilizator && u.parola === parola);

if (utilizatorGasit) {
  // setarea variabilei de sesiune cu datele utilizatorului autentificat (fără parolă)
    req.session.utilizator = { nume: utilizatorGasit.nume, prenume: utilizatorGasit.prenume };
    res.cookie('utilizator', utilizator);
    res.clearCookie('mesajEroare');
    res.redirect('/');
  } else {
    res.cookie('mesajEroare', 'Autentificarea a eșuat');
    res.redirect('autentificare');
  }
});

app.post("/rezultat-chestionar", async (req, res) => {
  console.log(req.body);
  let numarRaspunsuriCorecte = 0;
  const listaIntrebari = await citireIntrebari();
  for (let i = 0; i < listaIntrebari.length; i++) {
    const raspuns = req.body[`intrebare${i}`];
    if (raspuns != undefined && parseInt(raspuns) == listaIntrebari[i].corect) {
      numarRaspunsuriCorecte++;
    }
  }
  const numarIntrebari = listaIntrebari.length;
  res.render("rezultat-chestionar", {
    numarRaspunsuriCorecte: numarRaspunsuriCorecte,
    numarIntrebari: numarIntrebari,
    layout: "layout"
  });
});

app.post("/adaugare_cos", (req, res) => {
  const idProdus = req.body.id;
  if (!req.session.cos) {
    req.session.cos = [];
  }
  // Verificăm dacă produsul există deja în coș
  let produsInCos = req.session.cos.find((produs) => produs.id === idProdus);
  if (produsInCos) {
    // Dacă produsul există, creștem cantitatea
    produsInCos.cantitate++;
  } else {
    // Dacă produsul nu există, îl adăugăm cu cantitatea 1
    req.session.cos.push({ id: idProdus, cantitate: 1 });
  }
  res.redirect('/');
});

function getProduseDinCos(produseInCos, callback) {
  // Verificăm dacă avem ID-uri de produse în coș
  if (produseInCos.length === 0) {
    callback([]);
    return;
  }

  let iduriProduse = produseInCos.map((produs) => produs.id);
  let sql = `SELECT * FROM produse WHERE id IN (${iduriProduse.join(',')})`;
  db.query(sql, (error, results) => {
    if (error) {
      console.error('Eroare la interogarea bazei de date', error);
      callback([]);
      return;
    }

    // Adăugăm câmpul de cantitate pentru fiecare produs
    let produse = results.map((produs) => {
      let produsInCos = produseInCos.find((p) => parseInt(p.id) === parseInt(produs.id));
      let total = produs.pret * produsInCos.cantitate;
      return { ...produs, cantitate: produsInCos.cantitate, total: total };
    });
    

    callback(produse);
  });
}


app.get("/vizualizare_cos", autentificareMiddleware, (req, res) => {
  const iduriProduse = req.session.cos || [];
  getProduseDinCos(iduriProduse, (produseCos) => {
    res.render('vizualizare-cos', { produseCos: produseCos });
  });
});


app.listen(port, () =>
  console.log(`Serverul rulează la adresa http://localhost:`)
);
