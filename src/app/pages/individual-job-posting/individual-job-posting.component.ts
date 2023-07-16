import { Component } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import {
  Database,
  ref,
  child,
  remove,
  onValue,
  update,
} from '@angular/fire/database';
import { AuthService } from 'src/app/services/auth.service';
import firebase from 'firebase/compat/app';
import {
  Storage,
  ref as ref_storage,
  deleteObject,
} from '@angular/fire/storage';
import { StorageService } from 'src/app/services/storage.service';

@Component({
  selector: 'app-individual-job-posting',
  templateUrl: './individual-job-posting.component.html',
  styleUrls: ['./individual-job-posting.component.scss'],
})
export class IndividualJobPostingComponent {
  posting!: ParamMap;
  authority!: string;
  myUser!: any;
  index!: any;
  isEmployerWhoPosted: boolean = false;
  Applied: boolean = false;
  favorited: boolean = false;
  Uploading = false;
  canApply = true;

  constructor(
    private Acrouter: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    public database: Database,
    public storage: Storage,
    private storageService: StorageService
  ) {}

  ngOnInit() {
    this.posting = this.Acrouter.snapshot.queryParamMap;
    this.myUser = this.authService.getUser();
    if (this.myUser && this.posting) {
      if (this.myUser.photoURL == 'Student') {
        this.authority = 'Student';
      } else if (this.myUser.photoURL == 'Employer') {
        this.authority = 'Employer';
        if (this.myUser.uid == this.posting.get('EmployerID')) {
          this.isEmployerWhoPosted = true;
        }
      }
      const dbRef = ref(this.database);
      let id = this.myUser.uid;
      const starCountRef = child(dbRef, `students/${id}/Favorites`);
      onValue(starCountRef, (snapshot) => {
        const data = snapshot.val();
        const keys = Object.keys(data);
        if (keys.includes(this.posting.get('ID') as any)) {
          this.favorited = true;
        } else if (!keys.includes(this.posting.get('ID') as any)) {
          this.favorited = false;
        }
      });
      const studentRef = child(dbRef, `students/${id}`);
      onValue(studentRef, (snapshot) => {
        const data = snapshot.val();
        if (data.CV == '' || data.CV == null || data.CV == undefined) {
          this.canApply = false;
        }
      });
      const starCountRef1 = child(
        dbRef,
        `job-postings/${this.posting.get('ID')}/Candidates`
      );
      onValue(starCountRef1, (snapshot) => {
        const data = snapshot.val();
        const keys = Object.keys(data);
        if (keys.includes(this.myUser.uid)) {
          this.Applied = true;
        }
      });
      console.log('Applied : ' + this.Applied);
    }
  }

  onDeleteJobPosting() {
    if (this.myUser) {
      const dbRef = ref(this.database);
      let keys: any;

      //Remove the job posting's id from the student's JobsApplied
      const starCountRef = child(
        dbRef,
        `job-postings/${this.posting.get('ID')}/Candidates`
      );
      onValue(starCountRef, (snapshot) => {
        const data = snapshot.val();
        keys = Object.keys(data);
      });

      keys.forEach((key: any) => {
        const starCountRef1 = child(dbRef, `students/${key}/JobsApplied`);
        onValue(starCountRef1, (snapshot) => {
          const data = snapshot.val();
          const keys = Object.keys(data);
          //If there is only one key, then update it to an empty object instead of removing it
          if (keys.length == 1) {
            const userRef = child(dbRef, `students/${key}`);
            update(userRef, { JobsApplied: '' });
          } else if (keys.includes(this.posting.get('ID') as any)) {
            remove(
              child(
                dbRef,
                `students/${key}/JobsApplied/${this.posting.get('ID')}`
              )
            );
          }
        });
      }); //END OF JOBS APPLIED

      //Remove the job posting's id from the student's SelectedInterviews
      const starCountRef2 = child(
        dbRef,
        `job-postings/${this.posting.get('ID')}/SelectedInterviews`
      );
      onValue(starCountRef2, (snapshot) => {
        const data = snapshot.val();
        keys = Object.keys(data);
      });

      keys.forEach((key: any) => {
        const starCountRef3 = child(
          dbRef,
          `students/${key}/SelectedInterviews`
        );
        onValue(starCountRef3, (snapshot) => {
          const data = snapshot.val();
          const keys = Object.keys(data);
          //If there is only one key, then update it to an empty object instead of removing it
          if (keys.length == 1) {
            const userRef = child(dbRef, `students/${key}`);
            update(userRef, { SelectedInterviews: '' });
          } else if (keys.includes(this.posting.get('ID') as any)) {
            remove(
              child(
                dbRef,
                `students/${key}/SelectedInterviews/${this.posting.get('ID')}`
              )
            );
          }
        });
      }); //END OF SELECTED INTERVIEWS

      const httpsReference = firebase
        .storage()
        .refFromURL(this.posting.get('Image')!);
      let path = 'images/' + httpsReference.name;
      const fileRef = ref_storage(this.storage, path);
      deleteObject(fileRef)
        .then(() => {})
        .catch((error) => {});

      remove(child(dbRef, `job-postings/${this.posting.get('ID')}`));

      this.storageService.sendNotification(
        `Posting ${this.posting.get('JobTitle')} was deleted!`
      );
      this.router.navigate(['']);
    }
  }

  //will perform to backend for when apply button is clicked
  applyAftermath() {
    const dbRef = ref(this.database);
    if (this.myUser) {
      if (!this.canApply) {
        this.storageService.sendNotification(
          'You need to upload a CV before applying to a job posting'
        );
        return;
      }
      const starCountRef = child(
        dbRef,
        `job-postings/${this.posting.get('ID')}/Candidates`
      );
      onValue(starCountRef, (snapshot) => {
        const data = snapshot.val();
        const keys = Object.keys(data);
        if (!keys.includes(this.myUser.uid)) {
          //send user id to job posting in candidates attribute
          let id1 = this.myUser.uid;
          const dbRef = ref(this.database);
          const userRef1 = child(
            dbRef,
            `job-postings/${this.posting.get('ID')}/Candidates`
          );
          update(userRef1, { [id1]: '' });

          //send job posting to user student in appliedto attribute
          let id2 = this.posting.get('ID') as string;
          const userRef2 = child(
            dbRef,
            `students/${this.myUser.uid}/JobsApplied`
          );
          update(userRef2, { [id2]: '' });
        }
      });
    }
    this.storageService.sendNotification(
      'You have sucessfully applied to ' + this.posting.get('JobTitle')
    );
  }

  //Send to candidates page
  seeCandidates() {
    if (this.myUser) {
      this.posting = this.Acrouter.snapshot.queryParamMap;
    }
  }
  async addToFavorites() {
    this.Uploading = true;
    let keys: any;
    const dbRef = ref(this.database);
    let id = this.myUser.uid;
    if (this.myUser) {
      const starCountRef = child(dbRef, `students/${id}/Favorites`);
      onValue(starCountRef, (snapshot) => {
        const data = snapshot.val();
        keys = Object.keys(data);
      });
      if (!keys.includes(this.posting.get('ID') as any) || !keys) {
        let postingId = this.posting.get('ID') as any;
        const userRef = child(dbRef, `students/${id}/Favorites`);
        update(userRef, { [postingId]: '' });
      }

      this.favorited = true;
      this.storageService.sendNotification('Post has been added to Favorites');
      this.Uploading = false;
    }
  }
  deleteFromFavorites() {
    this.Uploading = true;
    const dbRef = ref(this.database);
    let keys: any;
    let id = this.myUser.uid;
    if (this.myUser) {
      const starCountRef = child(dbRef, `students/${id}/Favorites`);
      onValue(starCountRef, (snapshot) => {
        const data = snapshot.val();
        keys = Object.keys(data);
      });
      if (keys.length == 1) {
        //need to fix
        const userRef = child(dbRef, `students/${id}`);
        update(userRef, { Favorites: '' });
        let postingId = this.posting.get('ID') as any;
        remove(child(dbRef, `students/${id}/Favorites/${postingId}`));
        this.favorited = false;
        this.storageService.sendNotification(
          'Post has been removed from Favorites'
        );
        this.Uploading = false;
        return;
      } else if (keys.includes(this.posting.get('ID') as any)) {
        let postingId = this.posting.get('ID') as any;
        remove(child(dbRef, `students/${id}/Favorites/${postingId}`));
        this.favorited = false;
        this.storageService.sendNotification(
          'Post has been removed from Favorites'
        );
        this.Uploading = false;
        return;
      }
    }
  }
}
