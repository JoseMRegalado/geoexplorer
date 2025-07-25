import {Component, ElementRef, Input, ViewChild, OnChanges, Output, EventEmitter} from '@angular/core';
import { Network, Node as VisNode, Edge as VisEdge } from 'vis-network';
import { SparqlService } from '../../services/sparql.service';

@Component({
  selector: 'app-graph-view',
  templateUrl: './graph-view.component.html',
  styleUrls: ['./graph-view.component.css']
})
export class GraphViewComponent implements OnChanges {
  @Input() movie: any;
  @ViewChild('graphContainer', { static: true }) graphContainer!: ElementRef;
  @Output() directorClicked = new EventEmitter<string>();


  private network!: Network;
  private nodes: VisNode[] = [];
  private edges: VisEdge[] = [];
  private expandedNodes = new Set<string>();

  constructor(private sparqlService: SparqlService) {}

  ngOnChanges(): void {
    if (!this.movie) return;
    this.nodes = [];
    this.edges = [];
    this.expandedNodes.clear();

    // Nodo central (película)
    this.addMovieNode(this.movie.title);

    // Director
    this.movie.directors.forEach((director: string) => {
      this.addPersonNode(director, this.movie.title, 'Dirigida por', 'd-');
    });

    // Actores (máx 5)
    this.movie.actors.slice(0, 5).forEach((actor: string, i: number) => {
      this.addPersonNode(actor, this.movie.title, 'Actuación', `a-${i}-`);
    });

    this.drawNetwork();
  }

  private addMovieNode(title: string) {
    this.nodes.push({ id: title, label: title, shape: 'box', color: '#A2D2FF' });
  }

  private addPersonNode(name: string, from: string, label: string, prefix = '') {
    const id = `${prefix}${name}`;
    this.nodes.push({ id, label: name, shape: 'ellipse', color: label === 'Dirigida por' ? '#FFC6FF' : '#B9FBC0' });
    this.edges.push({ from, to: id, label });
  }

  private drawNetwork() {
    const data = { nodes: this.nodes, edges: this.edges };
    const options = {
      nodes: { font: { size: 16 } },
      edges: { font: { align: 'top' }, arrows: 'to' },
      physics: { stabilization: true },
      interaction: { hover: true, zoomView: false, // ← 🔥 desactiva zoom con scroll
        dragView: true}
    };

    this.network = new Network(this.graphContainer.nativeElement, data, options);

    this.network.on('click', async (params) => {
      const nodeId = params.nodes[0];
      if (!nodeId) return;

      if (nodeId.startsWith('d-')) {
        const director = nodeId.substring(2);
        if (this.expandedNodes.has(nodeId)) {
          this.removeChildrenOf(nodeId);
        } else {
          const films = await this.sparqlService.getMoviesByDirector(director).toPromise();
          // @ts-ignore
          films.forEach(film => {
            const filmNodeId = `f-${film.title}`;
            if (!this.nodes.find(n => n.id === filmNodeId)) {
              this.nodes.push({ id: filmNodeId, label: film.title, shape: 'box', color: '#FFD6A5' });
              this.edges.push({ from: nodeId, to: filmNodeId, label: 'Dirigió' });
            }
          });
          this.expandedNodes.add(nodeId);
        }
        this.drawNetwork();
      }

      if (nodeId.startsWith('f-')) {
        if (this.expandedNodes.has(nodeId)) {
          this.removeChildrenOf(nodeId);
        } else {
          const qid = await this.fetchWikidataId(nodeId.substring(2));
          const actors = await this.sparqlService.getActorsByMovie(qid).toPromise();
          // @ts-ignore
          actors.forEach((actor, i) => {
            const actorId = `a-${actor}-${nodeId}`;
            this.nodes.push({ id: actorId, label: actor, shape: 'ellipse', color: '#CAFFBF' });
            this.edges.push({ from: nodeId, to: actorId, label: 'Actuación' });
          });
          this.expandedNodes.add(nodeId);
        }
        this.drawNetwork();
      }
    });
  }

  private removeChildrenOf(nodeId: string) {
    this.nodes = this.nodes.filter(n => !this.edges.find(e => e.from === nodeId && e.to === n.id));
    this.edges = this.edges.filter(e => e.from !== nodeId);
    this.expandedNodes.delete(nodeId);
  }

  private async fetchWikidataId(label: string): Promise<string> {
    const apiUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(label)}&language=es&format=json&origin=*`;
    const response: any = await fetch(apiUrl).then(r => r.json());
    return response.search?.[0]?.id || '';
  }
}
