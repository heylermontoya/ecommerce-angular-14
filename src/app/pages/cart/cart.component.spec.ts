import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, RouterModule } from '@angular/router';

import { CartComponent } from './cart.component';

describe('CartComponent', () => {
  let component: CartComponent;
  let fixture: ComponentFixture<CartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CartComponent],
      imports: [
        RouterModule,
        NoopAnimationsModule,
        MatCardModule,
        MatIconModule,
        MatTableModule,
        MatButtonModule,
        MatSnackBarModule
      ],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(CartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose the expected table columns', () => {
    expect(component.displayedColumns).toEqual([
      'product',
      'name',
      'price',
      'quantity',
      'total',
      'action'
    ]);
  });

  it('should compute the cart total', () => {
    const total = component.getTotal([
      { id: 1, product: 'p.png', name: 'A', price: 10, quantity: 2 },
      { id: 2, product: 'p.png', name: 'B', price: 5, quantity: 3 }
    ]);
    expect(total).toBe(35);
  });
});
