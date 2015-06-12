var app = angular.module('myApp', ['ng']);

app.directive('counterDirective', function() {
  return {
    controller: 'MyController',
    templateUrl: '/directive.html'
  }
});

app.controller('MyController', function($scope, $http) {
  $scope.counter = 0;

  $http.get('/').success(function(data) {
    $scope.data = data;
  });

  // Emit event **after** apply is done
  setTimeout(function() {
    $scope.$emit('MyController');
  }, 0);
});
