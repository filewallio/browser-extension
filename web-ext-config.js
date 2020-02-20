module.exports = {
    // verbose: true,
    sourceDir: './addon',
    run: {
        firefoxProfile: './profile.firefox',
        keepProfileChanges: true,
        startUrl: [
            'https://duckduckgo.com/?q=sample+pdf',
            'https://duckduckgo.com/?q=http%3A%2F%2Fi.isha.ws%2Fpublic%2Febooks%2Fmystics-musings-preview.pdf&ia=web',
            'about:devtools-toolbox?type=extension&id=firefox-extension%40filewall.io',
        ]
    }
};
