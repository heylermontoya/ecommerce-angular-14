import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { FiltersComponent } from './components/filters/filters.component';
import { ProductBoxComponent } from './components/product-box/product-box.component';
import { ProductsHeaderComponent } from './components/products-header/products-header.component';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        HomeComponent,
        ProductsHeaderComponent,
        FiltersComponent,
        ProductBoxComponent
      ],
      imports: [
        NoopAnimationsModule,
        MatSidenavModule,
        MatGridListModule,
        MatCardModule,
        MatIconModule,
        MatMenuModule,
        MatExpansionModule,
        MatListModule,
        MatButtonModule,
        MatSnackBarModule
      ],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to 4 columns', () => {
    expect(component.cols).toBe(4);
  });

  it('should update the row height when the column count changes', () => {
    component.onColumnsCountChange(1);
    expect(component.cols).toBe(1);
    expect(component.rowHeight).toBe(400);
  });
});
