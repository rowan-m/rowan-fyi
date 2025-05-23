'use strict';

class Atomatic {
    constructor(elements) {
        this.elements = elements;
        this.curTag = 'hydrogen';
        this.updateFromUrl();

        let renderer = null;
        let worker = null;

        // if ('OffscreenCanvas' in window) {
        //     worker = new Worker('/worker.js');
        //     const nucleus = document.querySelector('canvas.nucleus').transferControlToOffscreen();
        //     const orbits = document.querySelector('canvas.orbits').transferControlToOffscreen();
        //     const electrons = document.querySelector('canvas.electrons').transferControlToOffscreen();
        //     worker.postMessage(
        //         { cmd: 'start', structure: this.curAtom, nucleus: nucleus, orbits: orbits, electrons, electrons },
        //         [nucleus, orbits, electrons]
        //     );
        // }
        // else {
            const electron = document.createElement('canvas');
            electron.width = 24;
            electron.height = 24;
      
            renderer = new CanvasRenderer(
                document.querySelector('canvas.nucleus'),
                document.querySelector('canvas.orbits'),
                electron
            );
            const atom = new AtomModel(this.curAtom, renderer);
            window.requestAnimationFrame(atom.tick);
        // }
    }

    updateFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);

        if (urlParams.has('e')) {
            this.curTag = urlParams.get('e');
        }

        this.populatePage();
    }

    populatePage() {
        this.curIndex = this.elements.findIndex((structure) => { return structure.tag === this.curTag; });
        this.prevIndex = (this.curIndex > 0) ? this.curIndex - 1 : this.elements.length - 1;
        this.nextIndex = (this.curIndex + 1 < this.elements.length) ? this.curIndex + 1 : 0;

        this.curAtom = this.elements[this.curIndex];
        this.prevAtom = this.elements[this.prevIndex];
        this.nextAtom = this.elements[this.nextIndex];

        const h2 = document.querySelector('h2');
        h2.textContent = this.curAtom.name;
        document.title = 'Atomatic ⚛️ ' + this.curAtom.name;
        const curCard = document.querySelector('section.current');
        this.populateCard(curCard, this.curAtom);

        const prevCard = document.querySelector('section.previous');
        this.populateCard(prevCard, this.prevAtom);

        const nextCard = document.querySelector('section.next');
        this.populateCard(nextCard, this.nextAtom);
    }

    populateCard(card, atom) {
        card.querySelector('.number').textContent = atom.number;
        card.querySelector('.symbol').textContent = atom.symbol;
        card.querySelector('.name').textContent = atom.name;
        card.querySelector('.mass').textContent = atom.mass;

        const link = card.querySelector('a');

        if (link) {
            link.href = '?e=' + atom.tag;
        }
    }
}

const elements = [
    { "tag": "hydrogen", "name": "Hydrogen", "symbol": "H", "number": 1, "mass": 1.01, "shells": [1], "radius": 25 },
    { "tag": "helium", "name": "Helium", "symbol": "He", "number": 2, "mass": 4.00, "shells": [2], "radius": 120 },
    { "tag": "lithium", "name": "Lithium", "symbol": "Li", "number": 3, "mass": 6.94, "shells": [2, 1], "radius": 145 },
    { "tag": "beryllium", "name": "Beryllium", "symbol": "Be", "number": 4, "mass": 9.01, "shells": [2, 2], "radius": 105 },
    { "tag": "boron", "name": "Boron", "symbol": "B", "number": 5, "mass": 10.81, "shells": [2, 3], "radius": 85 },
    { "tag": "carbon", "name": "Carbon", "symbol": "C", "number": 6, "mass": 12.01, "shells": [2, 4], "radius": 70 },
    { "tag": "nitrogen", "name": "Nitrogen", "symbol": "N", "number": 7, "mass": 14.01, "shells": [2, 5], "radius": 65 },
    { "tag": "oxygen", "name": "Oxygen", "symbol": "O", "number": 8, "mass": 16.00, "shells": [2, 6], "radius": 60 },
    { "tag": "fluorine", "name": "Fluorine", "symbol": "F", "number": 9, "mass": 19.00, "shells": [2, 7], "radius": 50 },
    { "tag": "neon", "name": "Neon", "symbol": "Ne", "number": 10, "mass": 20.18, "shells": [2, 8], "radius": 160 },
    { "tag": "sodium", "name": "Sodium", "symbol": "Na", "number": 11, "mass": 22.99, "shells": [2, 8, 1], "radius": 180 },
    { "tag": "magnesium", "name": "Magnesium", "symbol": "Mg", "number": 12, "mass": 24.31, "shells": [2, 8, 2], "radius": 150 },
    { "tag": "aluminium", "name": "Aluminium", "symbol": "Al", "number": 13, "mass": 26.98, "shells": [2, 8, 3], "radius": 125 },
    { "tag": "silicon", "name": "Silicon", "symbol": "Si", "number": 14, "mass": 28.09, "shells": [2, 8, 4], "radius": 110 },
    { "tag": "phosphorus", "name": "Phosphorus", "symbol": "P", "number": 15, "mass": 30.97, "shells": [2, 8, 5], "radius": 100 },
    { "tag": "sulfur", "name": "Sulfur", "symbol": "S", "number": 16, "mass": 32.06, "shells": [2, 8, 6], "radius": 100 },
    { "tag": "chlorine", "name": "Chlorine", "symbol": "Cl", "number": 17, "mass": 35.45, "shells": [2, 8, 7], "radius": 100 },
    { "tag": "argon", "name": "Argon", "symbol": "Ar", "number": 18, "mass": 39.95, "shells": [2, 8, 8], "radius": 71 },
    { "tag": "potassium", "name": "Potassium", "symbol": "K", "number": 19, "mass": 39.10, "shells": [2, 8, 8, 1], "radius": 220 },
    { "tag": "calcium", "name": "Calcium", "symbol": "Ca", "number": 20, "mass": 40.08, "shells": [2, 8, 8, 2], "radius": 180 },
    { "tag": "scandium", "name": "Scandium", "symbol": "Sc", "number": 21, "mass": 44.96, "shells": [2, 8, 9, 2], "radius": 160 },
    { "tag": "titanium", "name": "Titanium", "symbol": "Ti", "number": 22, "mass": 47.90, "shells": [2, 8, 10, 2], "radius": 140 },
    { "tag": "vanadium", "name": "Vanadium", "symbol": "V", "number": 23, "mass": 50.94, "shells": [2, 8, 11, 2], "radius": 135 },
    { "tag": "chromium", "name": "Chromium", "symbol": "Cr", "number": 24, "mass": 52.00, "shells": [2, 8, 13, 1], "radius": 140 },
    { "tag": "manganese", "name": "Manganese", "symbol": "Mn", "number": 25, "mass": 54.94, "shells": [2, 8, 13, 2], "radius": 140 },
    { "tag": "iron", "name": "Iron", "symbol": "Fe", "number": 26, "mass": 55.85, "shells": [2, 8, 14, 2], "radius": 140 },
    { "tag": "cobalt", "name": "Cobalt", "symbol": "Co", "number": 27, "mass": 58.93, "shells": [2, 8, 15, 2], "radius": 135 },
    { "tag": "nickel", "name": "Nickel", "symbol": "Ni", "number": 28, "mass": 58.70, "shells": [2, 8, 16, 2], "radius": 135 },
    { "tag": "copper", "name": "Copper", "symbol": "Cu", "number": 29, "mass": 63.55, "shells": [2, 8, 18, 1], "radius": 135 },
    { "tag": "zinc", "name": "Zinc", "symbol": "Zn", "number": 30, "mass": 65.38, "shells": [2, 8, 18, 2], "radius": 135 },
    { "tag": "gallium", "name": "Gallium", "symbol": "Ga", "number": 31, "mass": 69.72, "shells": [2, 8, 18, 3], "radius": 130 },
    { "tag": "germanium", "name": "Germanium", "symbol": "Ge", "number": 32, "mass": 72.59, "shells": [2, 8, 18, 4], "radius": 125 },
    { "tag": "arsenic", "name": "Arsenic", "symbol": "As", "number": 33, "mass": 74.92, "shells": [2, 8, 18, 5], "radius": 115 },
    { "tag": "selenium", "name": "Selenium", "symbol": "Se", "number": 34, "mass": 78.96, "shells": [2, 8, 18, 6], "radius": 115 },
    { "tag": "bromine", "name": "Bromine", "symbol": "Br", "number": 35, "mass": 79.90, "shells": [2, 8, 18, 7], "radius": 115 },
    { "tag": "krypton", "name": "Krypton", "symbol": "Kr", "number": 36, "mass": 83.80, "shells": [2, 8, 18, 8], "radius": 115 },
    { "tag": "rubidium", "name": "Rubidium", "symbol": "Rb", "number": 37, "mass": 85.47, "shells": [2, 8, 18, 8, 1], "radius": 235 },
    { "tag": "strontium", "name": "Strontium", "symbol": "Sr", "number": 38, "mass": 87.62, "shells": [2, 8, 18, 8, 2], "radius": 200 },
    { "tag": "yttrium", "name": "Yttrium", "symbol": "Y", "number": 39, "mass": 88.91, "shells": [2, 8, 18, 9, 2], "radius": 180 },
    { "tag": "zirconium", "name": "Zirconium", "symbol": "Zr", "number": 40, "mass": 91.22, "shells": [2, 8, 18, 10, 2], "radius": 155 },
    { "tag": "niobium", "name": "Niobium", "symbol": "Nb", "number": 41, "mass": 92.91, "shells": [2, 8, 18, 12, 1], "radius": 145 },
    { "tag": "molybdenum", "name": "Molybdenum", "symbol": "Mo", "number": 42, "mass": 95.94, "shells": [2, 8, 18, 13, 1], "radius": 145 },
    { "tag": "technetium", "name": "Technetium", "symbol": "Tc", "number": 43, "mass": 98.00, "shells": [2, 8, 18, 13, 2], "radius": 135 },
    { "tag": "ruthenium", "name": "Ruthenium", "symbol": "Ru", "number": 44, "mass": 101.07, "shells": [2, 8, 18, 15, 1], "radius": 130 },
    { "tag": "rhodium", "name": "Rhodium", "symbol": "Rh", "number": 45, "mass": 102.91, "shells": [2, 8, 18, 16, 1], "radius": 135 },
    { "tag": "palladium", "name": "Palladium", "symbol": "Pd", "number": 46, "mass": 106.40, "shells": [2, 8, 18, 18], "radius": 140 },
    { "tag": "silver", "name": "Silver", "symbol": "Ag", "number": 47, "mass": 107.87, "shells": [2, 8, 18, 18, 1], "radius": 160 },
    { "tag": "cadmium", "name": "Cadmium", "symbol": "Cd", "number": 48, "mass": 112.41, "shells": [2, 8, 18, 18, 2], "radius": 155 },
    { "tag": "indium", "name": "Indium", "symbol": "In", "number": 49, "mass": 114.82, "shells": [2, 8, 18, 18, 3], "radius": 155 },
    { "tag": "tin", "name": "Tin", "symbol": "Sn", "number": 50, "mass": 118.69, "shells": [2, 8, 18, 18, 4], "radius": 145 },
    { "tag": "antimony", "name": "Antimony", "symbol": "Sb", "number": 51, "mass": 121.75, "shells": [2, 8, 18, 18, 5], "radius": 145 },
    { "tag": "tellurium", "name": "Tellurium", "symbol": "Te", "number": 52, "mass": 127.60, "shells": [2, 8, 18, 18, 6], "radius": 140 },
    { "tag": "iodine", "name": "Iodine", "symbol": "I", "number": 53, "mass": 126.90, "shells": [2, 8, 18, 18, 7], "radius": 140 },
    { "tag": "xenon", "name": "Xenon", "symbol": "Xe", "number": 54, "mass": 131.30, "shells": [2, 8, 18, 18, 8], "radius": 140 },
    { "tag": "caesium", "name": "Caesium", "symbol": "Cs", "number": 55, "mass": 132.91, "shells": [2, 8, 18, 18, 8, 1], "radius": 265 },
    { "tag": "barium", "name": "Barium", "symbol": "Ba", "number": 56, "mass": 137.33, "shells": [2, 8, 18, 18, 8, 2], "radius": 215 },
    { "tag": "lanthanum", "name": "Lanthanum", "symbol": "La", "number": 57, "mass": 138.91, "shells": [2, 8, 18, 18, 9, 2], "radius": 195 },
    { "tag": "cerium", "name": "Cerium", "symbol": "Ce", "number": 58, "mass": 140.12, "shells": [2, 8, 18, 19, 9, 2], "radius": 185 },
    { "tag": "praseodymium", "name": "Praseodymium", "symbol": "Pr", "number": 59, "mass": 140.91, "shells": [2, 8, 18, 21, 8, 2], "radius": 185 },
    { "tag": "neodymium", "name": "Neodymium", "symbol": "Nd", "number": 60, "mass": 144.24, "shells": [2, 8, 18, 22, 8, 2], "radius": 185 },
    { "tag": "promethium", "name": "Promethium", "symbol": "Pm", "number": 61, "mass": 145.00, "shells": [2, 8, 18, 23, 8, 2], "radius": 185 },
    { "tag": "samarium", "name": "Samarium", "symbol": "Sm", "number": 62, "mass": 150.40, "shells": [2, 8, 18, 24, 8, 2], "radius": 185 },
    { "tag": "europium", "name": "Europium", "symbol": "Eu", "number": 63, "mass": 151.96, "shells": [2, 8, 18, 25, 8, 2], "radius": 185 },
    { "tag": "gadolinium", "name": "Gadolinium", "symbol": "Gd", "number": 64, "mass": 157.25, "shells": [2, 8, 18, 25, 9, 2], "radius": 180 },
    { "tag": "terbium", "name": "Terbium", "symbol": "Tb", "number": 65, "mass": 158.93, "shells": [2, 8, 18, 27, 8, 2], "radius": 175 },
    { "tag": "dysprosium", "name": "Dysprosium", "symbol": "Dy", "number": 66, "mass": 162.50, "shells": [2, 8, 18, 28, 8, 2], "radius": 175 },
    { "tag": "holmium", "name": "Holmium", "symbol": "Ho", "number": 67, "mass": 164.93, "shells": [2, 8, 18, 29, 8, 2], "radius": 175 },
    { "tag": "erbium", "name": "Erbium", "symbol": "Er", "number": 68, "mass": 167.26, "shells": [2, 8, 18, 30, 8, 2], "radius": 175 },
    { "tag": "thulium", "name": "Thulium", "symbol": "Tm", "number": 69, "mass": 168.93, "shells": [2, 8, 18, 31, 8, 2], "radius": 175 },
    { "tag": "ytterbium", "name": "Ytterbium", "symbol": "Yb", "number": 70, "mass": 173.04, "shells": [2, 8, 18, 32, 8, 2], "radius": 175 },
    { "tag": "lutetium", "name": "Lutetium", "symbol": "Lu", "number": 71, "mass": 174.97, "shells": [2, 8, 18, 32, 9, 2], "radius": 175 },
    { "tag": "hafnium", "name": "Hafnium", "symbol": "Hf", "number": 72, "mass": 178.49, "shells": [2, 8, 18, 32, 10, 2], "radius": 155 },
    { "tag": "tantalum", "name": "Tantalum", "symbol": "Ta", "number": 73, "mass": 180.95, "shells": [2, 8, 18, 32, 11, 2], "radius": 145 },
    { "tag": "tungsten", "name": "Tungsten", "symbol": "W", "number": 74, "mass": 183.85, "shells": [2, 8, 18, 32, 12, 2], "radius": 135 },
    { "tag": "rhenium", "name": "Rhenium", "symbol": "Re", "number": 75, "mass": 186.21, "shells": [2, 8, 18, 32, 13, 2], "radius": 135 },
    { "tag": "osmium", "name": "Osmium", "symbol": "Os", "number": 76, "mass": 190.20, "shells": [2, 8, 18, 32, 14, 2], "radius": 130 },
    { "tag": "iridium", "name": "Iridium", "symbol": "Ir", "number": 77, "mass": 192.22, "shells": [2, 8, 18, 32, 15, 2], "radius": 135 },
    { "tag": "platinum", "name": "Platinum", "symbol": "Pt", "number": 78, "mass": 195.09, "shells": [2, 8, 18, 32, 17, 1], "radius": 135 },
    { "tag": "gold", "name": "Gold", "symbol": "Au", "number": 79, "mass": 196.97, "shells": [2, 8, 18, 32, 18, 1], "radius": 135 },
    { "tag": "mercury", "name": "Mercury", "symbol": "Hg", "number": 80, "mass": 200.59, "shells": [2, 8, 18, 32, 18, 2], "radius": 150 },
    { "tag": "thallium", "name": "Thallium", "symbol": "Tl", "number": 81, "mass": 204.37, "shells": [2, 8, 18, 32, 18, 3], "radius": 190 },
    { "tag": "lead", "name": "Lead", "symbol": "Pb", "number": 82, "mass": 207.20, "shells": [2, 8, 18, 32, 18, 4], "radius": 180 },
    { "tag": "bismuth", "name": "Bismuth", "symbol": "Bi", "number": 83, "mass": 208.98, "shells": [2, 8, 18, 32, 18, 5], "radius": 160 },
    { "tag": "polonium", "name": "Polonium", "symbol": "Po", "number": 84, "mass": 209.00, "shells": [2, 8, 18, 32, 18, 6], "radius": 190 },
    { "tag": "astatine", "name": "Astatine", "symbol": "At", "number": 85, "mass": 210.00, "shells": [2, 8, 18, 32, 18, 7], "radius": 190 },
    { "tag": "radon", "name": "Radon", "symbol": "Rn", "number": 86, "mass": 222.00, "shells": [2, 8, 18, 32, 18, 8], "radius": 190 },
    { "tag": "francium", "name": "Francium", "symbol": "Fr", "number": 87, "mass": 223.00, "shells": [2, 8, 18, 32, 18, 8, 1], "radius": 215 },
    { "tag": "radium", "name": "Radium", "symbol": "Ra", "number": 88, "mass": 226.03, "shells": [2, 8, 18, 32, 18, 8, 2], "radius": 215 },
    { "tag": "actinium", "name": "Actinium", "symbol": "Ac", "number": 89, "mass": 227.03, "shells": [2, 8, 18, 32, 18, 9, 2], "radius": 195 },
    { "tag": "thorium", "name": "Thorium", "symbol": "Th", "number": 90, "mass": 232.04, "shells": [2, 8, 18, 32, 18, 10, 2], "radius": 180 },
    { "tag": "protactinium", "name": "Protactinium", "symbol": "Pa", "number": 91, "mass": 231.04, "shells": [2, 8, 18, 32, 20, 9, 2], "radius": 180 },
    { "tag": "uranium", "name": "Uranium", "symbol": "U", "number": 92, "mass": 238.03, "shells": [2, 8, 18, 32, 21, 9, 2], "radius": 175 },
    { "tag": "neptunium", "name": "Neptunium", "symbol": "Np", "number": 93, "mass": 237.05, "shells": [2, 8, 18, 32, 22, 9, 2], "radius": 175 },
    { "tag": "plutonium", "name": "Plutonium", "symbol": "Pu", "number": 94, "mass": 242.00, "shells": [2, 8, 18, 32, 24, 8, 2], "radius": 175 },
    { "tag": "americium", "name": "Americium", "symbol": "Am", "number": 95, "mass": 243.00, "shells": [2, 8, 18, 32, 25, 8, 2], "radius": 175 },
    { "tag": "curium", "name": "Curium", "symbol": "Cm", "number": 96, "mass": 247.00, "shells": [2, 8, 18, 32, 25, 9, 2], "radius": 176 },
    { "tag": "berkelium", "name": "Berkelium", "symbol": "Bk", "number": 97, "mass": 247.00, "shells": [2, 8, 18, 32, 27, 8, 2], "radius": 176 },
    { "tag": "californium", "name": "Californium", "symbol": "Cf", "number": 98, "mass": 251.00, "shells": [2, 8, 18, 32, 28, 8, 2], "radius": 176 },
    { "tag": "einsteinium", "name": "Einsteinium", "symbol": "Es", "number": 99, "mass": 252.00, "shells": [2, 8, 18, 32, 29, 8, 2], "radius": 176 },
    { "tag": "fermium", "name": "Fermium", "symbol": "Fm", "number": 100, "mass": 257.00, "shells": [2, 8, 18, 32, 30, 8, 2], "radius": 176 },
    { "tag": "mendelevium", "name": "Mendelevium", "symbol": "Md", "number": 101, "mass": 258.00, "shells": [2, 8, 18, 32, 31, 8, 2], "radius": 176 },
    { "tag": "nobelium", "name": "Nobelium", "symbol": "No", "number": 102, "mass": 250.00, "shells": [2, 8, 18, 32, 32, 8, 2], "radius": 176 },
    { "tag": "lawrencium", "name": "Lawrencium", "symbol": "Lr", "number": 103, "mass": 260.00, "shells": [2, 8, 18, 32, 32, 8, 3], "radius": 176 },
    { "tag": "rutherfordium", "name": "Rutherfordium", "symbol": "Rf", "number": 104, "mass": 261.00, "shells": [2, 8, 18, 32, 32, 10, 2], "radius": 176 },
    { "tag": "dubnium", "name": "Dubnium", "symbol": "Db", "number": 105, "mass": 262.00, "shells": [2, 8, 18, 32, 32, 11, 2], "radius": 176 },
    { "tag": "seaborgium", "name": "Seaborgium", "symbol": "Sg", "number": 106, "mass": 263.00, "shells": [2, 8, 18, 32, 32, 12, 2], "radius": 176 },
    { "tag": "bohrium", "name": "Bohrium", "symbol": "Bh", "number": 107, "mass": 262.00, "shells": [2, 8, 18, 32, 32, 13, 2], "radius": 176 },
    { "tag": "hassium", "name": "Hassium", "symbol": "Hs", "number": 108, "mass": 255.00, "shells": [2, 8, 18, 32, 32, 14, 2], "radius": 176 },
    { "tag": "meitnerium", "name": "Meitnerium", "symbol": "Mt", "number": 109, "mass": 256.00, "shells": [2, 8, 18, 32, 32, 15, 2], "radius": 190 }
];

new Atomatic(elements);