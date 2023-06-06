import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';

//import { fileURLToPath } from 'url';

@Injectable({
  providedIn: 'root'
})
export class PhotoService {

  public photos: UserPhoto[] = []; //array 'photos' de tipo UserPhotos, inicializado vacio

  private PHOTO_STORAGE: string = 'photos';

  private platform : Platform; //nos va a entregar informacion acerca del dispositivo con el que trabajamos

  constructor(platform : Platform) { this.platform = platform}



  public async addNewToGallery() {
    // Take a photo
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100
    });

    //Over in the addNewToGallery function, add the newly captured photo to the beginning of the Photos array.
    this.photos.unshift({
      filepath: "soon...",
      webviewPath: capturedPhoto.webPath
    });


     // Save the picture and add it to photo collection
    const savedImageFile = await this.savePicture(capturedPhoto);
    this.photos.unshift(savedImageFile);

    /*Byy adding it here, the Photos array is stored each time a new photo
    is taken. This way, it doesn’t matter when the app user closes or switches to a different app - all photo data is saved.
    */
    Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos),
    });

  }




  //Photo es una clase que viene de nuestra Camera Plugin
  private async savePicture(photo: Photo) {
    // Convert photo to base64 format, required by Filesystem API to save
    const base64Data = await this.readAsBase64(photo);

    // Write the file to the data directory
    const fileName = new Date().getTime() + '.jpeg';
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data
    });

    if (this.platform.is('hybrid')) {
      // Display the new image by rewriting the 'file://' path to HTTP
      // Details: https://ionicframework.com/docs/building/webview#file-protocol
      return {
        filepath: savedFile.uri,
        webviewPath: Capacitor.convertFileSrc(savedFile.uri),
      };
    }
    else {
      // Use webPath to display the new image instead of base64 since it's
      // already loaded into memory
      return {
        filepath: fileName,
        webviewPath: photo.webPath
      };
    }
  }


  /*A Blob (Binary Large Object) is a data type in JavaScript
  that represents immutable, raw data. It can store binary data, such as images, audio, video, or any other type of file data. */


  private async readAsBase64(photo: Photo) {
    // Fetch the photo, read as a blob, then convert to base64 format
    // "hybrid" will detect Cordova or Capacitor
  if (this.platform.is('hybrid')) {
    // Read the file into base64 format
    const file = await Filesystem.readFile({
      path: photo.path ?? ''
    });

    return file.data;
  }

    else{
    const response = await fetch(photo.webPath!); //con fetch hacemos una solicitud GET hacia el webPath de photo
    const blob = await response.blob(); //despues la respuesta es convertida en blob

    return await this.convertBlobToBase64(blob) as string; //returns, usando el método de mas abajo, el blob convertido en base64
  }
}


  /*
    In JavaScript, a Promise is an object that represents the eventual completion or failure of an asynchronous operation and its resulting value. It is a way to handle asynchronous code in a more organized and manageable manner.

    A Promise can be in one of three states:

    Pending: The initial state of a Promise. The asynchronous operation is still ongoing, and the Promise is neither fulfilled nor rejected.

    Fulfilled: The Promise has resolved successfully, and the asynchronous operation has completed. The Promise holds the resulting value.

    Rejected: The Promise has encountered an error or exception during its execution. The Promise holds the reason for the rejection.

    const promise = new Promise((resolve, reject) => {
      // Asynchronous operation
      // Call resolve(value) if the operation is successful
      // Call reject(error) if an error occurs
    });


  */
  private convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader(); //instancia de un FileReader
    reader.onerror = reject;
    reader.onload = () => {
        resolve(reader.result);
    };
    reader.readAsDataURL(blob);//este metodo toma un blob y permite comenzar a leerlo en formato data URL
  });


  /*
  Next, head back over to the loadSaved() function we implemented for the web earlier. On mobile, we can directly set the source of an
  image tag - <img src="x" /> - to each photo file on the Filesystem, displaying them automatically. Thus, only the web
  requires reading each image from the Filesystem into base64 format. Update this function to add an if statement around the Filesystem code
  */

  public async loadSaved() {
    // Retrieve cached photo array data
    const { value } = await Preferences.get({ key: this.PHOTO_STORAGE });
    this.photos = (value ? JSON.parse(value) : []) as UserPhoto[];

    // Easiest way to detect when running on the web:
    // “when the platform is NOT hybrid, do this”
    if (!this.platform.is('hybrid')) {
      // Display the photo by reading into base64 format
      for (let photo of this.photos) {
        // Read each saved photo's data from the Filesystem
        const readFile = await Filesystem.readFile({
            path: photo.filepath,
            directory: Directory.Data
        });

        // Web platform only: Load the photo as base64 data
        photo.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
      }
    }
  }

  //funcion para remover una foto, conectado con tab2.page.ts
  public async deletePicture(photo: UserPhoto, position: number) {
    // Remove this photo from the Photos reference data array
    this.photos.splice(position, 1);

    // Update photos array cache by overwriting the existing photo array
    Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos)
    });

    // delete photo file from filesystem
    const filename = photo.filepath
                        .substr(photo.filepath.lastIndexOf('/') + 1);

    await Filesystem.deleteFile({
      path: filename,
      directory: Directory.Data
    });
  }


}



export interface UserPhoto {
  filepath: string;
  webviewPath?: string;
}
