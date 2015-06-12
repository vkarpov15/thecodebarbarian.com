describe('counterDirective', function() {
  var injector;
  var element;
  var scope;
  var httpBackend;

  beforeEach(function() {
    injector = angular.injector(['myApp', 'ngMockE2E']);

    injector.invoke(function($rootScope, $compile, $httpBackend) {
      scope = $rootScope.$new();
      httpBackend = $httpBackend;
      httpBackend.whenGET('/directive.html').passThrough();
      element = $compile('<counter-directive></counter-directive>')(scope);
      scope.$apply();
    });
  });

  it('increments counter when you click', function(done) {
    httpBackend.expectGET('/').respond({ ok: 1 });

    scope.$on('MyController', function() {
      assert.equal(element.text().trim(), 'You\'ve clicked this div 0 times');
      element.find('div').click();
      assert.equal(element.text().trim(), 'You\'ve clicked this div 1 times');

      httpBackend.flush();
      assert.strictEqual(scope.data.ok, 1);

      done();
    });
  });
});
