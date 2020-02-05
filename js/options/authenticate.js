import { storage } from '../storage.js';

function setInputValue(input, value) {
    console.log('onChange', input.id, value)
    if (typeof value === 'boolean') {
        input.checked = value;
    } else {
        if (input.attributes['type'].value === 'range') input.MaterialSlider && input.MaterialSlider.change(value);
        else input.value = value;
    }
}
// storage.onChange().subscribe()
storage.onChange().subscribe( appData => {
    Object.keys(appData).forEach( key => {
        document.querySelectorAll(`div.option input[id='${key}']`)
            .forEach( input => setInputValue(input, appData[key]))
    })
});

document.querySelectorAll('div.option input[type="checkbox"]').forEach( el => {
    storage.appDataAsync().then( store => el.checked = store[el.name] );
    el.addEventListener( 'change', (event) => {
        const { name, checked } = event.target;
        storage.setAppData({
            [name]: checked
        })
        console.log('onClick', name, checked)
    })
});