var finalOrder = {};
var orderLineItems = {};
var finalAmount = 0;
var selectedState = [];

$(document).ready(function () {
	loadProducts();

	$('#place-order-button').click(function () {
		fetch('OrderProcessingServlet', {
			method: 'POST',
			body: JSON.stringify({ order: finalOrder }),
			headers: { 'content-type': 'application/json' },
		}).then(function (response) {
			if (response.ok) {
				console.log('Post Non Apple Payment successful !');
			} else {
				console.log('Post Non Apple Payment Post failed !!!');
			}
		});
	});

	displaySelectedItemsDiv(false);
	disableNonApplePayButton(true);
});

function disableNonApplePayButton(disable) {
	$('#place-order-button').prop('disabled', disable);
}

function displaySelectedItemsDiv(display) {
	if (display) {
		$('#selected-products-div').show();
	} else {
		$('#selected-products-div').hide();
	}
}

function loadProducts() {
	$.getJSON('content/products.json', function (data) {
		var listItems = [];

		$.each(data, function (key, val) {
			var orderLineItem = {
				product: val,
				count: 0,
			};

			if (orderLineItem.product.options) {
				for (option in orderLineItem.product.options) {
					var newProduct = { ...orderLineItem.product };
					newProduct.price = orderLineItem.product.options[option];
					newProduct.size = option;
					delete newProduct.options;
					orderLineItems[orderLineItem.product.id + '_' + option] = {
						product: newProduct,
						count: 0,
					};
				}
			}
			orderLineItems[orderLineItem.product.id] = orderLineItem;

			var listItem =
				'<li>' +
				'<a href="#" style="display: grid; grid-template-columns: 6em auto; padding-left:0em; background-color: white">' +
				'<img src="content/assets/productImages/' +
				orderLineItem.product.image +
				'" style="position:relative; margin: auto"/>' +
				'<div><h2>' +
				orderLineItem.product.name +
				'</h2>' +
				'<p> ' +
				orderLineItem.product.description +
				'</p>' +
				(typeof orderLineItem.product.options == 'undefined'
					? '<p style="font-weight: 800">$' +
					  orderLineItem.product.price / 100 +
					  ' ea.</p>'
					: buildOptions(
							orderLineItem.product.options,
							orderLineItem.product.id
					  )) +
				'</div></a>' +
				'<a id="btn_' +
				orderLineItem.product.id +
				'_add" onclick="productAdded(this)" href="#purchase" data-rel="popup" data-position-to="window" data-transition="pop">Add</a>' +
				'</li>';

			listItems.push(listItem);
		});

		$('#all-products').append(listItems.join(''));
		// Task 2: Add the missing line. Hint: The list may need to be refreshed to reapply the styles as the list is build dynamically instead of static
		$('#all-products').listview('refresh');
	});
}

function buildOptions(options, id) {
	var optionsHTML = '<div class="btn-group">';

	$.each(options, function (size, price) {
		optionsHTML =
			optionsHTML +
			'<button id="btn_' +
			id +
			'_' +
			size +
			'_add"' +
			'class = "ui-btn-inline"' +
			'onclick="selectedSize(this)">' +
			size +
			'</button>' +
			'<span> $' +
			price / 100.0 +
			'</span>&nbsp;&nbsp;&nbsp;';
	});

	optionsHTML = optionsHTML + '</div>';

	return optionsHTML;
}

function selectedSize(component) {
	var id = getProductId(component.id);
	selectedState = [id, component.textContent];
	console.log(selectedState);
}

function clearSelectedSize() {
	selectedState = [];
}

function productAdded(component) {
	var productId = getProductId(component.id);

	if (!orderLineItems[productId].product.options) {
		var orderLineItem = orderLineItems[productId];
		orderLineItem.count = orderLineItem.count + 1;
		orderLineItems[productId] = orderLineItem;
		console.log(productId);
	} else {
		if (!selectedState.length || !selectedState[0].includes(productId)) {
			alert('Please select a size first');
		} else {
			productId = selectedState[0];
			var orderLineItem = orderLineItems[productId];
			orderLineItem.count = orderLineItem.count + 1;
			orderLineItems[productId] = orderLineItem;
		}
	}

	calculatePrice();
	disableNonApplePayButton(false);
	repaintSelectedList();
	clearSelectedSize();
}

function productRemoved(component) {
	var productId = getProductId(component.id);
	var orderLineItem = orderLineItems[productId];
	if (orderLineItem.count > 0) {
		orderLineItem.count = orderLineItem.count - 1;
		orderLineItems[productId] = orderLineItem;
		console.log(productId + ' - ' + orderLineItem.count);
	}

	calculatePrice();
	repaintSelectedList();
	if (orderLineItem.count == 0) disableNonApplePayButton(true);
}

function repaintSelectedList() {
	var listSelectedItems = [];
	$.each(orderLineItems, function (key, orderLineItem) {
		if (orderLineItem.count != 0) {
			var listSelectedItem =
				'<li>' +
				'<a href="#" style="display: grid; grid-template-columns: 6em auto; padding-left:0em; background-color: white">' +
				'<img src="content/assets/productImages/' +
				orderLineItem.product.image +
				'" style="position:relative; margin: auto; "/>' +
				'<div> <h2>' +
				orderLineItem.product.name +
				'</h2>' +
				'<p>' +
				(orderLineItem.product.size
					? `Size: ${orderLineItem.product.size}, `
					: '') +
				'Qty: ' +
				orderLineItem.count +
				'</p><p style="font-weight: 700"> $' +
				orderLineItem.product.price / 100.0 +
				'</p></div>' +
				'<a id="btn_' +
				key +
				'_add" onclick="productRemoved(this)" href="#purchase" data-rel="popup" data-position-to="window" data-transition="pop">Remove</a>' +
				'</li>';

			listSelectedItems.push(listSelectedItem);
		}
	});

	$('#selected-products').empty();
	$('#selected-products').append(listSelectedItems.join(''));
	$('#selected-products').listview('refresh');

	if (listSelectedItems.length == 0) {
		displaySelectedItemsDiv(false);
	} else {
		displaySelectedItemsDiv(true);
	}
}

function getProductId(componentId) {
	var firstIndex = componentId.indexOf('_') + 1;
	var lastIndex = componentId.lastIndexOf('_');

	return componentId.substring(firstIndex, lastIndex);
}

function calculatePrice() {
	var subTotal = 0.0;
	var finalOrderItems = [];

	$.each(orderLineItems, function (key, orderLineItem) {
		if (orderLineItem.count != 0) {
			subTotal = subTotal + orderLineItem.count * orderLineItem.product.price;
			finalOrderItems.push(orderLineItem);
		}
	});
	var formattedSubTotal = subTotal / 100.0;

	$('#payment_amount').text('$' + formattedSubTotal);

	finalOrder = {
		finalOrderItems: finalOrderItems,
		subTotal: subTotal,
		formattedSubTotal: formattedSubTotal,
	};

	finalAmount = subTotal;
	console.log('Final amount : ' + finalAmount);
	console.log(JSON.stringify(finalOrder));
}
