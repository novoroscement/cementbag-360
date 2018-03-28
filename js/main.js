jQuery(document).ready(function($){

	var productFeature = function(element) {
	    this.element = element;
	    this.frames = [];
	    this.tooltip = new Tooltip(element, {
	    	placement: 'bottom',
	    	trigger: 'hover focus',
	    	title: element.data('tooltip')
	    });
	}

	productFeature.prototype.changeVisibility = function(currentFrame) {
		var frameInfo = null;
		for (var i = this.frames.length - 1; i >= 0; i--) {
			if (currentFrame == this.frames[i].frame) {
				frameInfo = this.frames[i];
			}
		}
	    
	    if (frameInfo == null)
	    {
	   		this.tooltip.hide();
	        this.element.fadeOut(100);
	        return;
	    }

	    this.element.css({ 
	      top: frameInfo.y, 
	      left: frameInfo.x,
	      visibility: 'visible'
	    });
	    
	    this.element.fadeIn(100);
	}

	var frameVisibility = function(frameNum, xPos, yPos) {
	    this.frame = frameNum;
	    this.x = xPos;
	    this.y = yPos;
	}

	var productViewer = function(element) {
		this.element = element;
		this.handleContainer = this.element.find('.cd-product-viewer-handle');
		this.handleFill = this.handleContainer.children('.fill');
		this.handle = this.handleContainer.children('.handle');
		this.imageWrapper = this.element.find('.product-viewer');
		this.slideShow = this.imageWrapper.children('.product-sprite');
		this.slideShowPreview = this.imageWrapper.children('#product-preview');
		this.frames = this.element.data('frame');
		//increase this value to increase the friction while dragging on the image - it has to be bigger than zero
		this.friction = this.element.data('friction');
		this.visibleFrame = 0;
		this.loaded = false;
		this.animating = false;
		this.xPosition = 0;
		this.features = [];
        this.featuresContainer = this.element.find('.features');
	    this.busy = false;
	} 

	productViewer.prototype.loadFrames = function() {
		var self = this,
			imageUrl = this.slideShow.data('image'),
			newImg = $('<img/>');
		this.loading('0.5');
		//you need this to check if the image sprite has been loaded
		newImg.attr('src', imageUrl).load(function() {
			$(this).remove();
  			self.loaded = true;
  		}).each(function(){
  			image = this;
			if(image.complete) {
		    	$(image).trigger('load');
		  	}
		});
	}

	productViewer.prototype.updateFeaturesTransform = function() {
		var imageWrapperPosition = this.imageWrapper.position();
		
		this.featuresContainer.css({
			position: 'absolute',
			top: imageWrapperPosition.top,
			left: imageWrapperPosition.left,
			width: this.imageWrapper.width(),
			height: this.imageWrapper.height()
		});
	};

	productViewer.prototype.loadFeatures = function(callback) {
		var self = this;

		this.imageWrapper.resize(function () { 
			self.updateFeaturesTransform();
	  		self.updateFeatures();
		});

		$(window).resize(function () { 
			self.updateFeaturesTransform();
	  		self.updateFeatures();
	  	});

		this.updateFeaturesTransform();


		var posScaleX = 1.0;
		var posScaleXData = this.featuresContainer.data('pos-scale-x');
		if (posScaleXData != undefined)
			posScaleX = parseFloat(posScaleXData);

		var posScaleY = 1.0;
		var posScaleYData = this.featuresContainer.data('pos-scale-y');
		if (posScaleYData != undefined)
			posScaleY = parseFloat(posScaleYData);

		var posOffsetX = 0;
		var posOffsetXData = this.featuresContainer.data('pos-offset-x');
		if (posOffsetXData != undefined)
			posOffsetX = parseFloat(posOffsetXData);

		var posOffsetY = 0;
		var posOffsetYData = this.featuresContainer.data('pos-offset-y');
		if (posOffsetYData != undefined)
			posOffsetY = parseFloat(posOffsetYData);


	    var featureDomList = $('.feature');

	    featureDomList.each(function(index) {
			var featureDom = $(this);
			var feature = new productFeature(featureDom);
			var dataSlide = featureDom.data('slide');
			var positionInfos = dataSlide.match( /\(\d+,\d+,\d+\)/g );
			for (var i = 0; i < positionInfos.length; i++)
			{
			  var tupleData = positionInfos[i].match( /\d+/g );
			  var frame = parseInt(tupleData[0], 10);
			  var x = parseInt(tupleData[1], 10) * posScaleX + posOffsetX;
			  var y = parseInt(tupleData[2], 10) * posScaleY + posOffsetY;
			  var frameInfo = new frameVisibility(frame, x, y);
			  feature.frames.push(frameInfo);
			}
			
            self.features.push(feature);

	        if (callback != null && callback != undefined && index === featureDomList.length - 1)
	            callback();
	    });
    }

	productViewer.prototype.loading = function(percentage) {
		var self = this;
		transformElement(this.handleFill, 'scaleX('+ percentage +')');
		setTimeout(function(){
			if( self.loaded ){
				//sprite image has been loaded
				self.element.addClass('loaded');
				transformElement(self.handleFill, 'scaleX(1)');
				self.dragImage();
				if(self.handle) self.dragHandle();

	  			self.updateFeatures();
		    	self.slideShowPreview.animate({ opacity: 0 })
			} else {
				//sprite image has not been loaded - increase self.handleFill scale value
				var newPercentage = parseFloat(percentage) + .1;
				if ( newPercentage < 1 ) {
					self.loading(newPercentage);
				} else {
					self.loading(parseFloat(percentage));
				}
			}
		}, 500);
	}
	//draggable funtionality - credits to http://css-tricks.com/snippets/jquery/draggable-without-jquery-ui/
	productViewer.prototype.dragHandle = function() {
		//implement handle draggability
		var self = this;
		self.handle.on('mousedown vmousedown', function (e) {
	        self.handle.addClass('cd-draggable');
	        var dragWidth = self.handle.outerWidth(),
	            containerOffset = self.handleContainer.offset().left,
	            containerWidth = self.handleContainer.outerWidth(),
	            minLeft = containerOffset - dragWidth/2,
	            maxLeft = containerOffset + containerWidth - dragWidth/2;

	        self.xPosition = self.handle.offset().left + dragWidth - e.pageX;

	        self.element.on('mousemove vmousemove', function (e) {
	        	if( !self.animating) {
	        		self.animating =  true;
		        	( !window.requestAnimationFrame )
		        		? setTimeout(function(){self.animateDraggedHandle(e, dragWidth, containerOffset, containerWidth, minLeft, maxLeft);}, 100)
		        		: requestAnimationFrame(function(){self.animateDraggedHandle(e, dragWidth, containerOffset, containerWidth, minLeft, maxLeft);});
	        	}
	        }).one('mouseup vmouseup', function (e) {
	            self.handle.removeClass('cd-draggable');
	            self.element.off('mousemove vmousemove');
	        });

	        e.preventDefault();

	    }).on('mouseup vmouseup', function (e) {
	        self.handle.removeClass('cd-draggable');
	    });
	}

	productViewer.prototype.animateDraggedHandle = function(e, dragWidth, containerOffset, containerWidth, minLeft, maxLeft) {
		var self = this;
		var leftValue = e.pageX + self.xPosition - dragWidth;
	    // constrain the draggable element to move inside his container
	    if (leftValue < minLeft) {
	        leftValue = minLeft;
	    } else if (leftValue > maxLeft) {
	        leftValue = maxLeft;
	    }

	    var widthValue = Math.ceil( (leftValue + dragWidth / 2 - containerOffset) * 1000 / containerWidth)/10;
	    self.visibleFrame = Math.ceil( (widthValue * (self.frames-1))/100 );

	    //update image frame
	    self.updateFrame();
	    self.updateFeatures();

	    //update handle position
	    $('.cd-draggable', self.handleContainer).css('left', widthValue + '%').one('mouseup vmouseup', function () {
	        $(this).removeClass('cd-draggable');
	    });

	    self.animating = false;
	}

	productViewer.prototype.dragImage = function() {
		//implement image draggability
		var self = this;
		self.slideShow.on('mousedown vmousedown', function (e) {
	        self.slideShow.addClass('cd-draggable');
	        var containerOffset = self.imageWrapper.offset().left,
	            containerWidth = self.imageWrapper.outerWidth(),
	            minFrame = 0,
	            maxFrame = self.frames - 1;

	        self.xPosition = e.pageX;

	        self.element.on('mousemove vmousemove', function (e) {
	        	if( !self.animating) {
	        		self.animating =  true;
		        	( !window.requestAnimationFrame )
		        		? setTimeout(function(){self.animateDraggedImage(e, containerOffset, containerWidth);}, 100)
		        		: requestAnimationFrame(function(){self.animateDraggedImage(e, containerOffset, containerWidth);});
		        }
	        }).one('mouseup vmouseup', function (e) {
	            self.slideShow.removeClass('cd-draggable');
	            self.element.off('mousemove vmousemove');
	            self.updateHandle();
	        });

	        e.preventDefault();

	    }).on('mouseup vmouseup', function (e) {
	        self.slideShow.removeClass('cd-draggable');
	    });
	}

	productViewer.prototype.animateDraggedImage = function(e, containerOffset, containerWidth) {
		var self = this;
		var leftValue = self.xPosition - e.pageX;
        var widthValue = Math.ceil( (leftValue) * 100 / ( containerWidth * self.friction ));
        var frame = (widthValue * (self.frames-1))/100;
        if( frame > 0 ) {
        	frame = Math.floor(frame);
        } else {
        	frame = Math.ceil(frame);
        }
        var newFrame = self.visibleFrame + frame;

        if (newFrame < 0) {
            newFrame = self.frames - 1;
        } else if (newFrame > self.frames - 1) {
            newFrame = 0;
        }

        if( newFrame != self.visibleFrame ) {
        	self.visibleFrame = newFrame;
        	self.updateFrame();
        	self.updateFeatures();
        	self.xPosition = e.pageX;
        }

        self.animating =  false;
	}

	productViewer.prototype.updateHandle = function() {
		if(this.handle) {
			var widthValue = 100*this.visibleFrame/this.frames;
			this.handle.animate({'left': widthValue + '%'}, 200);
		}
	}

	productViewer.prototype.updateFrame = function() {
		var transformValue = - (100 * this.visibleFrame/this.frames);
		transformElement(this.slideShow, 'translateX('+transformValue+'%)');

    }

    productViewer.prototype.slideTo = function (targetFrame, targetFeature, increment, iteration) {
        if (this.busy && (iteration == undefined || iteration === 0)) return;
        this.busy = true;

        if (iteration == undefined)
        	iteration = 0;

        targetFrame = parseInt(targetFrame) % this.frames;

        if (this.visibleFrame === targetFrame) {
            targetFeature.element.addClass("hovered");
            targetFeature.tooltip.show();
            this.updateHandle();
            this.updateFeatures();
            this.busy = false;
            return;
        }

        if (increment == undefined) {
            increment = (this.visibleFrame + this.frames - targetFrame) > (targetFrame - this.visibleFrame) ? -1 : 1;
        }

        this.visibleFrame = (this.visibleFrame + increment) % this.frames;
        this.updateFrame();

    	if (iteration >= this.frames)
    		return;

        var self = this;
        setTimeout(function () {
            self.slideTo(targetFrame, targetFeature, increment, iteration + 1);
        }, 24);
    }

	productViewer.prototype.updateFeatures = function() {
		var self = this;
		this.features.forEach(function(feature) {
        	feature.changeVisibility(self.visibleFrame);
        });
	}

	function transformElement(element, value) {
		element.css({
			'-moz-transform': value,
		    '-webkit-transform': value,
			'-ms-transform': value,
			'-o-transform': value,
			'transform': value,
		});
    }
    
    var viewer = new productViewer($('.cd-product-viewer-wrapper'));

    viewer.loadFrames();
    viewer.loadFeatures();
    
    $('.feature-explicit').each(function () {
        var productFeature = null;
        for (var i = viewer.features.length - 1; i >= 0; i--) {
            if ($(this).data('feature-id') === viewer.features[i].element.attr('id')) {
                productFeature = viewer.features[i];
            }
        }

        if (productFeature == null)
            return;

        $($(this).children('.feature-explicit-expand')[0]).text(productFeature.element.data('tooltip'));

        var runSlideShow = false;
        var targetSlide = parseInt($(this).data('slide'));
        $(this).hover(function () {

            runSlideShow = true;
            setTimeout(function () {

                if (!runSlideShow)
                    return;

                runSlideShow = false;

                viewer.features.forEach(function (f) {
                    f.tooltip.hide();
                    f.element.css({
                        visibility: 'hidden'
                    });
                });
                viewer.slideTo(targetSlide, productFeature);
            }, 250);
        });

        $(this).mouseleave(function () {
            runSlideShow = false;
            productFeature.tooltip.hide();
            productFeature.element.removeClass("hovered");
        });
    });

});