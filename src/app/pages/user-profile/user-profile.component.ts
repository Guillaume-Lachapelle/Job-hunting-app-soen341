import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormGroupDirective, NgForm, Validators } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import AOS from 'aos';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import {Database,set,ref,update, onValue, get, child, remove} from '@angular/fire/database'
import { Storage, ref as ref_storage, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';
import { StudentProfile } from 'src/app/models/user.models';
import { StorageService } from 'src/app/services/storage.service';

/** Error when invalid control is dirty, touched, or submitted. */
export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(
    control: FormControl | null,
    form: FormGroupDirective | NgForm | null
  ): boolean {
    const isSubmitted = form && form.submitted;
    return !!(
      control &&
      control.invalid &&
      (control.dirty || control.touched || isSubmitted)
    );
  }
}


@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
})
export class UserProfileComponent {
  registerForm!: FormGroup;
  matcher = new MyErrorStateMatcher();
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  submitted = false;

  public file: any = {};

  constructor(
    public database: Database,
    public storage: Storage,
    public storageService: StorageService,
    private formBuilder: FormBuilder,
    private snackBar: MatSnackBar
  ) {}

  defaultStudent = {} as StudentProfile;

  ngOnInit(): void {
    this.registerForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
    //  password: ['', [Validators.required, Validators.minLength(6)]],
      first_name: ['', [Validators.required]],
      last_name: ['', [Validators.required]],
      tel: ['', [Validators.required, Validators.pattern('[- +()0-9]{8,12}')]],
      language: ['', [Validators.required]],
      personal_description: ['', [Validators.required]],
      program: ['', [Validators.required]],
      CV: [null, [Validators.required]],
    });

    //example using a hard coded id (reading user profile)
    AOS.init();
    const dbRef = ref(this.database);
    const studentRef = child(dbRef, 'students/21');
    onValue(studentRef, (snapshot) => {
    const data = snapshot.val();
    const keys = Object.keys(data);
    const values = Object.values(data);
    console.log(data);
    console.log(keys);
    console.log(values);
    this.defaultStudent = data;
    });
  }

  handleFileInput(event: any){
    this.file = event.target.files[0];
  }

  onSubmit() {

    // stop the process here if form is invalid
    if (this.registerForm.invalid) {
      this.sendNotification('make sure to answer all required fields');
      return;
    }

    var myDownloadLink = this.storageService.uploadToFirestore(this.file, 'CVs/', this.storage);
    // (async() => {
    //   console.log("waiting for variable");
    //   while(!myDownloadLink) // define the condition as you like
    //     await new Promise(resolve => setTimeout(resolve, 1000));
    // console.log("variable is defined");
    // console.log(myDownloadLink)
    // })();
    this.onEditUser(35, this.registerForm.value, myDownloadLink);

    // this.registerUser(this.registerForm.value);
    //  this.submitted = true;

    // this.readUser(90);
    // this.onEditUser(42, this.registerForm.value)
    // this.onDeleteUser(90);
  }

  registerUser(value:any){
    set(ref(this.database, 'students/' + Math.floor(Math.random()*100)), {
      FirstName: value.first_name,
      LastName: value.last_name,
      PhoneNumber: value.tel,
      Email: value.email,
      Language: value.language,
    });
alert('user created!')
  }

  grabUser(value:any){
    const studentRef = ref(this.database, 'students/' );
  onValue(studentRef, (snapshot) => {
  const data = snapshot.val();
  });
}

readUser(value:any) {
  const dbRef = ref(this.database);
  get(child(dbRef, `students/${value}`)).then((snapshot) => {
    if (snapshot.exists()) {
      console.log(snapshot.val());
    } else {
      console.log("No data available");
    }
  }).catch((error) => {
    console.error(error);
  });
}
//Once authentication is implemented, firstname, lastname and email should not be modifiable
onEditUser(index:any, value:any, myDownloadLink: string) {
  const dbRef = ref(this.database);
  update(child(dbRef, `students/${index}`), {
    FirstName: value.first_name,
    LastName: value.last_name,
    PhoneNumber: value.tel,
    Email: value.email,
    Language: value.language, 
    CV: myDownloadLink, 
  });
  alert(`user ${index} was updated!`)
}

onDeleteUser(index:any) {
  const dbRef = ref(this.database);  
  remove(child(dbRef, `students/${index}`));
  alert(`user ${index} was deleted!`)
}

  sendNotification(text: string) {
    this.snackBar.open(text, '', {
      duration: 3000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }
}
