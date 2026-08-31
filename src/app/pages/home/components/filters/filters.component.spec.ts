import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { FiltersComponent } from './filters.component';

describe('FiltersComponent', () => {
  let component: FiltersComponent;
  let fixture: ComponentFixture<FiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FiltersComponent],
      imports: [NoopAnimationsModule, MatExpansionModule, MatListModule]
    }).compileComponents();

    fixture = TestBed.createComponent(FiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose the available categories', () => {
    expect(component.categories).toEqual(['shoes', 'sports']);
  });

  it('should emit the selected category', () => {
    let emitted: string | undefined;
    component.showCategory.subscribe((category: string) => (emitted = category));
    component.onShowCategory('shoes');
    expect(emitted).toBe('shoes');
  });
});
