import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { PanelComponent } from './components/panel/panel.component';
import { CompletarRegistroComponent } from './components/completar-registro/completar-registro.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'completar-registro', component: CompletarRegistroComponent },
  { path: 'panel', component: PanelComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];