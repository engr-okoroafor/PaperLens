import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the PaperLens title', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('PaperLens');
  });

  it('should open language dropdown and change language when an option is clicked', async () => {
    const fixture = TestBed.createComponent(App);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    // Open language menu
    const langBtn = fixture.nativeElement.querySelector('.scroll-fab.lang-fab') as HTMLButtonElement;
    langBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.langMenuOpen()).toBe(true);

    // Find French or Spanish option
    const options = fixture.nativeElement.querySelectorAll('.lang-option-btn') as NodeListOf<HTMLButtonElement>;
    expect(options.length).toBeGreaterThan(1);

    const esOption = Array.from(options).find((btn) => btn.textContent?.includes('Español'));
    expect(esOption).toBeTruthy();
    esOption?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.lang.currentLang()).toBe('es');
    expect(component.langMenuOpen()).toBe(false);

    // Verify brand tag translated
    const brandTag = fixture.nativeElement.querySelector('.brand-tag') as HTMLElement;
    expect(brandTag.textContent).toContain('Investigación abierta');
  });
});
