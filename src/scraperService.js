const { getBooks, getGeneral } = require('./scrapers.js');


(async () => {
    try {
        const resultBooks = await getBooks();
        const resultComputers = await getGeneral('computers');
        const resultElectronics = await getGeneral('electronics');
        const resultGame = await getGeneral('videogames');

        console.log(resultBooks, resultComputers, resultElectronics, resultGame);
    } catch (error) {
        console.error('Error', error);
    }
})();
