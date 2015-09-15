app.directive('asdrv', function() {
	return {
		type: 'E',
		templateUrl: 'templates/adsrv.directive.html',
		scope: {
			title: '=',
			label: '=',
			value:'=',
			min: '=',
			max: '='
		},
		link: function($scope, $element, $attrs) {

		}
	}
})