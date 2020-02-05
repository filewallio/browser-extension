module.exports = {
    // verbose: true,
    sourceDir: './addon',
    run: {
        firefoxProfile: './profile.firefox',
        keepProfileChanges: true,
        startUrl: [
            'https://duckduckgo.com/?q=sample+pdf',
            'about:devtools-toolbox?type=extension&id=firefox-extension%40filewall.io',
        ]
    }
};
