import { TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { CartItem } from '../models/cart.model';
import { CartService } from './cart.service';

describe('CartService', () => {
  let service: CartService;

  const item: CartItem = {
    id: 1,
    product: 'shoes.png',
    name: 'Zapatillas',
    price: 50,
    quantity: 1
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, MatSnackBarModule]
    });
    service = TestBed.inject(CartService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with an empty cart', () => {
    expect(service.cart.value.items.length).toBe(0);
  });

  it('should add an item to the cart', () => {
    service.addToCart({ ...item });
    expect(service.cart.value.items.length).toBe(1);
    expect(service.cart.value.items[0].name).toBe('Zapatillas');
  });

  it('should increase the quantity when adding the same item twice', () => {
    service.addToCart({ ...item });
    service.addToCart({ ...item });
    expect(service.cart.value.items.length).toBe(1);
    expect(service.cart.value.items[0].quantity).toBe(2);
  });

  it('should compute the total of the cart', () => {
    const total = service.getTotal([
      { ...item, price: 10, quantity: 2 },
      { ...item, id: 2, price: 5, quantity: 3 }
    ]);
    expect(total).toBe(35);
  });

  it('should clear the cart', () => {
    service.addToCart({ ...item });
    service.clearCart();
    expect(service.cart.value.items.length).toBe(0);
  });

  it('should remove an item from the cart', () => {
    service.addToCart({ ...item });
    service.removeFromCart({ ...item });
    expect(service.cart.value.items.length).toBe(0);
  });
});
