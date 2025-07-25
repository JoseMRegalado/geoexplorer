// src/app/services/sparql.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import {map, Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SparqlService {

  private wikidataUrl = 'https://query.wikidata.org/sparql';

  constructor(private http: HttpClient) {}

  getMoviesByTitle(title: string): Observable<any> {
    const query = `
    SELECT ?film ?filmLabel ?directorLabel (GROUP_CONCAT(DISTINCT ?actorLabel; separator=", ") AS ?actors) ?poster WHERE {
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:endpoint "www.wikidata.org";
                    wikibase:api "EntitySearch";
                    mwapi:search "${title}";
                    mwapi:language "es".
    ?film wikibase:apiOutputItem mwapi:item.
    ?num wikibase:apiOrdinal true.
  }

  ?film wdt:P31 wd:Q11424;      # es instancia de película
        wdt:P57 ?director;
        wdt:P161 ?actor.

  OPTIONAL { ?film wdt:P154 ?poster. }

  # Pedir explícitamente las etiquetas para las variables necesarias
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "es".
    ?film rdfs:label ?filmLabel.
    ?director rdfs:label ?directorLabel.
    ?actor rdfs:label ?actorLabel.
  }
}
GROUP BY ?film ?filmLabel ?directorLabel ?poster
LIMIT 10

  `;

    const headers = new HttpHeaders().set('Accept', 'application/sparql-results+json');
    const params = new HttpParams().set('query', query);

    return this.http.get<any>(this.wikidataUrl, { headers, params }).pipe(
      map((response) => {
        return response.results.bindings.map((item: any) => ({
          title: item.filmLabel?.value || 'Sin título',
          directors: item.directorLabel?.value ? [item.directorLabel.value] : [],
          actors: item.actors?.value ? item.actors.value.split(', ') : [],
          poster: item.poster?.value || null,
        }));
      })
    );
  }

  getMoviesByDirector(directorName: string): Observable<any[]> {
    const query = `
    SELECT DISTINCT ?film ?filmLabel WHERE {
  # ?film es una instancia de película y tiene un director (?director) y un actor (?actor)
  ?film wdt:P31 wd:Q11424;
        wdt:P57 ?director;
        wdt:P161 ?actor.
  ?director rdfs:label "${directorName}"@es.
  # Obtenemos las etiquetas en español para las variables ?film y ?actor
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "es".
    ?film rdfs:label ?filmLabel.
  }
}
LIMIT 20
  `;

    const headers = new HttpHeaders().set('Accept', 'application/sparql-results+json');
    const params = new HttpParams().set('query', query);

    return this.http.get<any>(this.wikidataUrl, { headers, params }).pipe(
      map(response => {
        const filmsMap: {[key:string]: any} = {};
        response.results.bindings.forEach((item: any) => {
          const filmId = item.film.value;
          if (!filmsMap[filmId]) {
            filmsMap[filmId] = {
              title: item.filmLabel?.value || 'Sin título',
              actors: new Set<string>()
            };
          }
          if (item.actorLabel?.value) {
            filmsMap[filmId].actors.add(item.actorLabel.value);
          }
        });

        return Object.values(filmsMap).map(film => ({
          title: film.title,
          actors: Array.from(film.actors)
        }));
      })
    );
  }

  getActorsByMovie(movieId: string): Observable<string[]> {
    const query = `
    SELECT DISTINCT ?actorLabel WHERE {
      wd:${movieId} wdt:P161 ?actor.
      SERVICE wikibase:label {
        bd:serviceParam wikibase:language "es".
        ?actor rdfs:label ?actorLabel.
      }
    }
    LIMIT 5
  `;

    const headers = new HttpHeaders().set('Accept', 'application/sparql-results+json');
    const params = new HttpParams().set('query', query);

    return this.http.get<any>(this.wikidataUrl, { headers, params }).pipe(
      map((response) =>
        response.results.bindings.map((item: any) => item.actorLabel.value)
      )
    );
  }




}
