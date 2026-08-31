import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Product } from '../models/product.model';
import { StoreService } from './store.service';

describe('StoreService', () => {
  let service: StoreService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(StoreService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should request all products with the default parameters', () => {
    const products: Array<Product> = [
      {
        id: 1,
        title: 'Zapatillas',
        price: 99.9,
        category: 'shoes',
        description: 'Zapatillas de running',
        image: 'shoes.png'
      }
    ];

    let received: Array<Product> | undefined;
    service.getAllProducts().subscribe((response) => (received = response));

    const req = httpMock.expectOne(
      'https://fakestoreapi.com/products?sort=desc&limit=12'
    );
    expect(req.request.method).toBe('GET');
    req.flush(products);

    expect(received).toEqual(products);
  });

  it('should honour the limit and sort arguments', () => {
    service.getAllProducts('5', 'asc').subscribe();

    const req = httpMock.expectOne(
      'https://fakestoreapi.com/products?sort=asc&limit=5'
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
