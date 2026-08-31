import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ProductsHeaderComponent } from './products-header.component';

describe('ProductsHeaderComponent', () => {
  let component: ProductsHeaderComponent;
  let fixture: ComponentFixture<ProductsHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProductsHeaderComponent],
      imports: [NoopAnimationsModule, MatCardModule, MatIconModule, MatMenuModule, MatButtonModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductsHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start sorted descending showing 12 items', () => {
    expect(component.sort).toBe('desc');
    expect(component.itemsShowCount).toBe(12);
  });

  it('should update the sort order', () => {
    component.onSortUpdated('asc');
    expect(component.sort).toBe('asc');
  });

  it('should update the number of items shown', () => {
    component.onItemsUpdated(24);
    expect(component.itemsShowCount).toBe(24);
  });
});
