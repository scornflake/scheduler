import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app.module';
import {spy} from "mobx";

spy((event) => {
    if (event.type === 'action') {
        // console.log(`SPY: ${event.name} with args: ${event.arguments}`)
    } else if(event.type === 'update') {
        // console.log(`SPY: update ${event.object.constructor.name}.${event.name}  from ${event.oldValue} to ${event.newValue}`)
    }
});

platformBrowserDynamic().bootstrapModule(AppModule);
