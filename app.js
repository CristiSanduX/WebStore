const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser')
const app = express();
const port = 6789;
// directorul 'views' va conține fișierele .ejs (html + js executat la server)
app.set('view engine', 'ejs');
// suport pentru layout-uri - implicit fișierul care reprezintă template-ul site-ului este views/layout.ejs
app.use(expressLayouts);
app.set('layout', 'layout');
// directorul 'public' va conține toate resursele accesibile direct de către client (e.g., fișiere css, javascript, imagini)
app.use(express.static('public'))
// corpul mesajului poate fi interpretat ca json; datele de la formular se găsesc în format json în req.body
app.use(bodyParser.json());
// utilizarea unui algoritm de deep parsing care suportă obiecte în obiecte
app.use(bodyParser.urlencoded({
    extended: true
}));

const listaIntrebari = [{
        intrebare: 'Când a fost realizată prima fotografie din lume?',
        variante: ['1750', '1929', '1826', '1580'],
        corect: 2
    },
    {
        intrebare: 'De la ce vine abrevierea DSLR?',
        variante: ['Dont shoot like Rambo', 'Digital single lens refraction', 'Digital single lens reflex', 'Dont stop living and romancing'],
        corect: 2
    },
    {
        intrebare: 'Câți pixeli are un megapixel?',
        variante: ['o mie', 'o sută', 'un miliard', 'un milion'],
        corect: 3
    },
    {
        intrebare: 'Care este obiectivul cel mai utilizat în fotografia de portrete?',
        variante: ['ultra-wide', 'telephoto', 'macro', 'standard'],
        corect: 3
    },
    {
        intrebare: 'Ce înseamnă acronimul ISO în fotografie?',
        variante: ['Image Sensor Operation', 'International Standards Organization', 'I Shoot Often', 'Internal Shutter Option'],
        corect: 1
    }
    //...
];
// la accesarea din browser adresei http://localhost:6789/ se va returna textul 'Hello World'
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res
app.get('/', (req, res) => res.send('Hello World'));
// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția specificată
app.get('/chestionar', (req, res) => {
    // în fișierul views/chestionar.ejs este accesibilă variabila 'intrebari' care conține vectorul de întrebări
    res.render('chestionar', {
        intrebari: listaIntrebari,
        layout: 'layout'
    });

});
app.post('/rezultat-chestionar', (req, res) => {
    console.log(req.body);
    let numarRaspunsuriCorecte = 0;
    for (let i = 0; i < listaIntrebari.length; i++) {
        const raspuns = req.body[`intrebare${i}`];
        if (raspuns != undefined && parseInt(raspuns) == listaIntrebari[i].corect) {
            numarRaspunsuriCorecte++;
        }
    }
    const numarIntrebari = listaIntrebari.length;
    res.render('rezultat-chestionar', {
        numarRaspunsuriCorecte: numarRaspunsuriCorecte,
        numarIntrebari: numarIntrebari,
        layout: 'layout'
    });

});



app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:`));