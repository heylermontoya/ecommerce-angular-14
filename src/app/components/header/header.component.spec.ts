import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, RouterModule } from '@angular/router';

import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HeaderComponent],
      imports: [
        RouterModule,
        NoopAnimationsModule,
        MatToolbarModule,
        MatIconModule,
        MatMenuModule,
        MatBadgeModule,
        MatButtonModule,
        MatSnackBarModule
      ],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with zero items in the cart', () => {
    expect(component.itemsQuantity).toBe(0);
  });

  it('should recalculate the item quantity when the cart input changes', () => {
    component.cart = {
      items: [
        { id: 1, product: 'p.png', name: 'A', price: 10, quantity: 2 },
        { id: 2, product: 'p.png', name: 'B', price: 5, quantity: 3 }
      ]
    };
    expect(component.itemsQuantity).toBe(5);
  });
});
