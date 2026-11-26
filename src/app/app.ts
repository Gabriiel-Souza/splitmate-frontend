import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  template: `<h1>{{ mensagem() }}</h1>`,
})
export class App {
  private http = inject(HttpClient);
  mensagem = signal('Carregando...');

  constructor() {
    this.http
      .get<{ message: string }>('http://localhost:3000/api/hello')
      .subscribe((res) => this.mensagem.set(res.message));
  }
}
