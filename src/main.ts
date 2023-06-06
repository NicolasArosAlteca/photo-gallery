import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

//para importar nuestro PWA elements que instalamos previamente en linea de comando
import { defineCustomElements } from '@ionic/pwa-elements/loader';


if (environment.production) {
  enableProdMode();
}

// Call the element loader after the platform has been bootstrapped


platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .then(() => {
    // Call the element loader after the platform has been bootstrapped
    defineCustomElements(window);
  })
  .catch((err: any) => console.log(err));

