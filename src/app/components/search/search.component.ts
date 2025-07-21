// src/app/search/search.component.ts
import { Component } from '@angular/core';
import { SparqlService } from '../../services/sparql.service';
interface Movie {
  title: string;
  actors: string[];
  director?: string;
}


@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent {
  title = '';
  results: any[] = [];
  selectedMovie: any = null;



  constructor(private sparqlService: SparqlService) {}

  buscarPeliculas() {
    console.log('Buscando:', this.title);

    this.sparqlService.getMoviesByTitle(this.title).subscribe({
      next: (data) => {
        console.log('Respuesta de Wikidata (ya mapeada):', data);
        this.results = data;
      },
      error: (err) => {
        console.error('Error en consulta SPARQL:', err);
      }
    });
  }

  mostrarGrafo(movie: any) {
    this.selectedMovie = movie;
  }

  onDirectorClicked(directorName: string) {
    this.sparqlService.getMoviesByDirector(directorName).subscribe({
      next: (movies) => {
        // Añade las películas si no se han expandido antes
        if (!this.selectedMovie.expandedMovies) {
          this.selectedMovie.expandedMovies = [];
        }

        const nuevos = movies.filter(
          (newMovie: Movie) =>
            !this.selectedMovie.expandedMovies.some(
              (m: Movie) => m.title === newMovie.title
            )
        ).map((m: Movie) => ({ ...m, director: directorName }));


        this.selectedMovie.expandedMovies.push(...nuevos);
        this.selectedMovie = { ...this.selectedMovie }; // forzar cambio
      }
    });
  }


}
