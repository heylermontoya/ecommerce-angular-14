import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ProductBoxComponent } from './product-box.component';

describe('ProductBoxComponent', () => {
  let component: ProductBoxComponent;
  let fixture: ComponentFixture<ProductBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProductBoxComponent],
      imports: [NoopAnimationsModule, MatCardModule, MatIconModule, MatButtonModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not be in full width mode by default', () => {
    expect(component.fullWidthMode).toBeFalse();
  });

  it('should emit the product when added to the cart', () => {
    const product = {
      id: 1,
      title: 'Zapatillas',
      price: 99.9,
      category: 'shoes',
      description: 'Zapatillas de running',
      image: 'shoes.png'
    };
    component.product = product;

    let emitted: unknown;
    component.addToCart.subscribe((value: unknown) => (emitted = value));
    component.onAddToCart();

    expect(emitted).toEqual(product);
  });
});
