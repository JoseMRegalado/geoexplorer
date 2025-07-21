// movie-list.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-movie-list',
  templateUrl: './movie-list.component.html',
  styleUrls: ['./movie-list.component.css']
})
export class MovieListComponent {
  @Input() movies: any[] = [];
  @Output() selectMovie = new EventEmitter<any>();

  onSelectMovie(movie: any) {
    this.selectMovie.emit(movie);
  }
}
