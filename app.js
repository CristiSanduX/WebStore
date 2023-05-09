const cookieParser = require('cookie-parser')
const session = require('express-session');
const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const bodyParser = require("body-parser");
const fs = require('fs');
const fs2 = require("fs").promises; // modulul fs pentru a citi fișierul JSON
const app = express();
const port = 6789;

app.use(session({
  secret: 'secret-key', // cheia secretă utilizată pentru a cripta cookie-ul de sesiune
  resave: false, // salvează sesiunea chiar dacă nu a fost modificată
  saveUninitialized: false // nu salvează sesiunea dacă nu a fost inițializată
}));

//app.use(express.urlencoded({ extended: false }));


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
  res.render("index", {
    layout: "layout",
    utilizator: utilizator
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

app.listen(port, () =>
  console.log(`Serverul rulează la adresa http://localhost:`)
);
